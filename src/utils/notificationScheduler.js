const toLocalDateOnly = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const getTodayLocal = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const isSameDay = (dateStr) => {
  const date = toLocalDateOnly(dateStr);
  if (!date) return false;
  return date.getTime() === getTodayLocal().getTime();
};

const getTaskStatus = (deadline) => {
  const today = getTodayLocal();
  const due = toLocalDateOnly(deadline);
  if (!due) return "UPCOMING";

  if (due < today) return "OVERDUE";
  if (due.getTime() === today.getTime()) return "DUE TODAY";

  return "UPCOMING";
};

const isEvent = (item) => item.type === "event";
const isTask = (item) => !isEvent(item);
const getTitle = (item) => item.title || item.task || "";

const getTaskDueDateTime = (task) => {
  const [year, month, day] = task.deadline.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 0);
};

const getEventStartDateTime = (event) => {
  const [hours, minutes] = (event.startTime || "00:00").split(":").map(Number);
  const [year, month, day] = event.eventDate.split("-").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const getLocalDateKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const buildReminder = ({
  id,
  type,
  title,
  message,
  icon,
  browserTitle,
  browserBody,
}) => ({
  id,
  type,
  title,
  message,
  icon,
  browserTitle,
  browserBody,
  createdAt: new Date().toISOString(),
});

/**
 * Compute reminders that should be generated based on current tasks/events.
 * Skips any reminder whose id is already in existingIds.
 */
export function computePendingReminders(tasks, existingIds) {
  const pending = [];
  const seen = existingIds instanceof Set ? existingIds : new Set(existingIds);
  const now = new Date();

  for (const item of tasks) {
    if (item.completed) continue;

    if (isTask(item)) {
      const title = getTitle(item);
      const status = getTaskStatus(item.deadline);
      const dueDateTime = getTaskDueDateTime(item);
      const minutesUntilDue = (dueDateTime - now) / 60000;

      if (status === "OVERDUE") {
        const id = `task-${item.id}-overdue`;
        if (!seen.has(id)) {
          pending.push(
            buildReminder({
              id,
              type: "task-overdue",
              icon: "🔔",
              title: "Task Overdue",
              message: `${title} is overdue.`,
              browserTitle: "MyPA Reminder",
              browserBody: `${title} is overdue.`,
            })
          );
        }
      } else if (minutesUntilDue > 0) {
        if (
          item.priority === "High" &&
          minutesUntilDue <= 60 &&
          minutesUntilDue > 30
        ) {
          const id = `task-${item.id}-high-1hour`;
          if (!seen.has(id)) {
            const mins = Math.round(minutesUntilDue);
            pending.push(
              buildReminder({
                id,
                type: "task-high-1hour",
                icon: "🔔",
                title: "Task Due Soon",
                message: `${title} is due in ${mins} minutes.`,
                browserTitle: "MyPA Reminder",
                browserBody: `${title} is due in ${mins} minutes.`,
              })
            );
          }
        }

        if (minutesUntilDue <= 30) {
          const id = `task-${item.id}-30min`;
          if (!seen.has(id)) {
            const mins = Math.max(1, Math.round(minutesUntilDue));
            pending.push(
              buildReminder({
                id,
                type: "task-30min",
                icon: "🔔",
                title: "Task Due Soon",
                message: `${title} is due in ${mins} minutes.`,
                browserTitle: "MyPA Reminder",
                browserBody: `${title} is due in ${mins} minutes.`,
              })
            );
          }
        }
      }
    } else if (isEvent(item)) {
      const title = getTitle(item);
      if (!isSameDay(item.eventDate)) continue;

      const startDateTime = getEventStartDateTime(item);
      const minutesUntilStart = (startDateTime - now) / 60000;

      if (minutesUntilStart <= 30 && minutesUntilStart > 10) {
        const id = `event-${item.id}-30min`;
        if (!seen.has(id)) {
          const mins = Math.round(minutesUntilStart);
          pending.push(
            buildReminder({
              id,
              type: "event-30min",
              icon: "📅",
              title: "Upcoming Event",
              message: `${title} starts in ${mins} minutes.`,
              browserTitle: "Upcoming Event",
              browserBody: `${title} starts in ${mins} minutes.`,
            })
          );
        }
      }

      if (minutesUntilStart <= 10 && minutesUntilStart > 0) {
        const id = `event-${item.id}-10min`;
        if (!seen.has(id)) {
          const mins = Math.max(1, Math.round(minutesUntilStart));
          pending.push(
            buildReminder({
              id,
              type: "event-10min",
              icon: "📅",
              title: "Upcoming Event",
              message: `${title} starts in ${mins} minutes.`,
              browserTitle: "Upcoming Event",
              browserBody: `${title} starts in ${mins} minutes.`,
            })
          );
        }
      }

      if (minutesUntilStart <= 0) {
        const id = `event-${item.id}-started`;
        if (!seen.has(id)) {
          pending.push(
            buildReminder({
              id,
              type: "event-started",
              icon: "📅",
              title: "Event Started",
              message: `${title} has started.`,
              browserTitle: "Upcoming Event",
              browserBody: `${title} has started.`,
            })
          );
        }
      }
    }
  }

  const overdueTaskCount = tasks.filter(
    (t) => !t.completed && isTask(t) && getTaskStatus(t.deadline) === "OVERDUE"
  ).length;

  if (overdueTaskCount >= 3) {
    const rescueId = `rescue-${getLocalDateKey()}`;
    if (!seen.has(rescueId)) {
      pending.push(
        buildReminder({
          id: rescueId,
          type: "rescue",
          icon: "🚨",
          title: "Rescue Reminder",
          message: "You have multiple overdue tasks.",
          browserTitle: "MyPA Reminder",
          browserBody:
            "You're falling behind. Open AI Rescue Mode to recover today's schedule.",
        })
      );
    }
  }

  return pending;
}

export function formatNotificationTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
