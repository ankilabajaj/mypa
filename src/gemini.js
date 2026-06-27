export async function breakdownTask(taskName) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = "gemini-3.1-flash-lite";

  console.log("Gemini model:", model);
  console.log("Gemini API key detected:", Boolean(apiKey));

  if (!apiKey) {
    return "Gemini API key not found.";
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Break this task into 5-8 simple actionable steps. Return only bullet points.\n\nTask: ${taskName}`,
                },
              ],
            },
          ],
        }),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Gemini request failed");
      console.error("Gemini status:", response.status);
      console.error("Gemini response body:", responseText);
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const data = JSON.parse(responseText);
    console.log("Gemini successful response:", data);

    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Unable to generate task breakdown right now."
    );
  } catch (error) {
    console.error("Gemini error:", error);
    return "Unable to generate task breakdown right now.";
  }
}

function getTaskStatus(deadline) {
  const today = new Date();
  const due = new Date(deadline);
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return "OVERDUE";
  if (diff === 0) return "DUE TODAY";
  if (diff <= 7) return "THIS WEEK";

  return "UPCOMING";
}

function formatTaskStatusLabel(deadline) {
  const status = getTaskStatus(deadline);

  if (status === "OVERDUE") return "Overdue";
  if (status === "DUE TODAY") return "Due Today";
  if (status === "THIS WEEK") return "This Week";

  return "Upcoming";
}

function parseFocusJson(text) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned);

  if (
    typeof parsed.focus !== "string" ||
    typeof parsed.reason !== "string" ||
    !parsed.focus.trim() ||
    !parsed.reason.trim()
  ) {
    return null;
  }

  return { focus: parsed.focus.trim(), reason: parsed.reason.trim() };
}

export async function generateTodaysFocus(tasks) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = "gemini-3.1-flash-lite";

  if (!apiKey) {
    return null;
  }

  const getTitle = (item) => item.title || item.task || "";
  const getNotes = (item) => item.description || item.notes || "";

  const incompleteTasks = tasks.filter(
    (item) => item.type !== "event" && !item.completed
  );

  if (incompleteTasks.length === 0) {
    return null;
  }

  const now = new Date();
  const currentDate = now.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const currentTime = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayOfWeek = now.toLocaleDateString("en-GB", { weekday: "long" });

  const taskList = incompleteTasks
    .map((task) => {
      const notes = getNotes(task);
      return `- Title: ${getTitle(task)}
  Priority: ${task.priority}
  Deadline: ${task.deadline}
  Status: ${formatTaskStatusLabel(task.deadline)}${notes ? `\n  Notes: ${notes}` : ""}`;
    })
    .join("\n\n");

  const prompt = `You are an expert AI productivity coach.

Your job is to choose the SINGLE most important task the user should focus on RIGHT NOW.

You will receive:
- Current date
- Current time
- Current day of the week
- A list of incomplete tasks

Evaluate EVERY task independently before making your decision.

Do NOT choose a task simply because it appears first in the list.

Use the following priority rules in order:

1. Overdue tasks should generally come first.
2. Tasks due today should usually come before future tasks.
3. High priority tasks should usually come before Medium and Low priority tasks.
4. If two tasks have the same priority and deadline, prefer work, study, career, coding, software development, hackathon, project, business, research, and learning over household chores, errands, or leisure activities.
5. Prefer tasks that unblock other work or have the greatest long-term impact.
6. Consider the current time of day when deciding.
7. Choose the task that provides the greatest productivity benefit if completed now.

Current date: ${currentDate}
Current local time: ${currentTime}
Current day of week: ${dayOfWeek}

Incomplete tasks:
${taskList}

Return ONLY valid JSON in this exact format with no markdown, no code fences, and no additional text:
{"focus":"Task title exactly as listed","reason":"Brief explanation of why this task should be the focus right now"}

Example:
{"focus":"Build Knowledge Graph","reason":"This is the highest-impact project task due today. Completing it first reduces project risk and unlocks progress on your hackathon."}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    clearTimeout(timeoutId);

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Gemini focus request failed");
      console.error("Gemini status:", response.status);
      console.error("Gemini response body:", responseText);
      return null;
    }

    const data = JSON.parse(responseText);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return null;
    }

    return parseFocusJson(text);
  } catch (error) {
    console.error("Gemini focus error:", error);
    return null;
  }
}

export async function generateDailyPlan(
  tasks,
  { productivityScore, overdueCount, dueTodayCount } = {}
) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = "gemini-3.1-flash-lite";

  console.log("Gemini model:", model);
  console.log("Gemini API key detected:", Boolean(apiKey));

  if (!apiKey) {
    return "Gemini API key not found.";
  }

  const getTitle = (item) => item.title || item.task || "";
  const getNotes = (item) => item.description || item.notes || "";

  const isToday = (dateStr) => {
    const today = new Date();
    const d = new Date(`${dateStr}T00:00:00`);
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const activeItems = tasks.filter((item) => !item.completed);
  const todaysEvents = activeItems.filter(
    (item) => item.type === "event" && isToday(item.eventDate)
  );
  const activeTasks = activeItems.filter((item) => item.type !== "event");

  const now = new Date();
  const currentDate = now.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const currentTime = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayOfWeek = now.toLocaleDateString("en-GB", { weekday: "long" });

  const eventList =
    todaysEvents.length > 0
      ? todaysEvents
          .map((event) => {
            const notes = getNotes(event);
            return `- ${getTitle(event)}
  Start: ${event.startTime}
  End: ${event.endTime}${notes ? `\n  Description: ${notes}` : ""}`;
          })
          .join("\n\n")
      : "None scheduled for today.";

  const taskList =
    activeTasks.length > 0
      ? activeTasks
          .map((task) => {
            const notes = getNotes(task);
            return `- ${getTitle(task)}
  Priority: ${task.priority}
  Deadline: ${task.deadline}
  Status: ${formatTaskStatusLabel(task.deadline)}${notes ? `\n  Description: ${notes}` : ""}`;
          })
          .join("\n\n")
      : "None remaining.";

  const dashboardMetrics = [
    productivityScore !== undefined
      ? `Productivity: ${productivityScore}%`
      : null,
    overdueCount !== undefined ? `Overdue tasks: ${overdueCount}` : null,
    dueTodayCount !== undefined ? `Due today: ${dueTodayCount}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `You are a professional AI productivity assistant.

You are creating a realistic schedule for the REMAINDER of today.

Current date:
${currentDate}

Current day of week:
${dayOfWeek}

Current local time:
${currentTime}
${dashboardMetrics ? `\nDashboard summary:\n${dashboardMetrics}` : ""}

Current events for today:
${eventList}

Current incomplete tasks:
${taskList}

Rules:
- Never schedule anything before the current local time.
- Start planning from the current time onward.
- Respect existing events and never schedule tasks during event times.
- Schedule higher-priority and more urgent tasks first.
- Keep the schedule realistic.
- Include short breaks between long work sessions when appropriate.
- Include meal breaks only if appropriate for the current time of day.
- Leave small buffer periods before important events when appropriate.
- If very little time remains today, recommend only the most important tasks.
- If there are no remaining tasks, recommend planning tomorrow or taking a well-deserved break.

Return the plan in clean Markdown exactly as expected by the existing UI.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Gemini request failed");
      console.error("Gemini status:", response.status);
      console.error("Gemini response body:", responseText);
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const data = JSON.parse(responseText);
    console.log("Gemini successful response:", data);

    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Unable to generate daily plan right now."
    );
  } catch (error) {
    console.error("Gemini error:", error);
    return "Unable to generate daily plan right now.";
  }
}

export async function generateRescuePlan(tasks, productivityScore) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = "gemini-3.1-flash-lite";

  console.log("Gemini model:", model);
  console.log("Gemini API key detected:", Boolean(apiKey));

  if (!apiKey) {
    return "Gemini API key not found.";
  }

  const getTitle = (item) => item.title || item.task || "";

  const overdueTasks = tasks.filter(
    (task) =>
      task.type !== "event" &&
      !task.completed &&
      getTaskStatus(task.deadline) === "OVERDUE"
  );

  const highPriorityTasks = tasks.filter(
    (task) =>
      task.type !== "event" && !task.completed && task.priority === "High"
  );

  const upcomingEvents = tasks.filter(
    (item) => item.type === "event" && !item.completed
  );

  const remainingTasks = tasks.filter(
    (task) => task.type !== "event" && !task.completed
  );

  const formatList = (items, formatter) =>
    items.length > 0
      ? items.map(formatter).join("\n")
      : "None";

  const prompt = `You are an AI productivity coach.

The user has fallen behind.

Current productivity:
${productivityScore}%

Overdue Tasks:
${formatList(overdueTasks, (task) => `- ${getTitle(task)} (${getTaskStatus(task.deadline)})`)}

High Priority Tasks:
${formatList(highPriorityTasks, (task) => `- ${getTitle(task)} (${getTaskStatus(task.deadline)})`)}

Upcoming Events:
${formatList(upcomingEvents, (event) => `- ${getTitle(event)} on ${event.eventDate} ${event.startTime}-${event.endTime}`)}

Remaining Tasks:
${formatList(remainingTasks, (task) => `- ${getTitle(task)} | ${task.priority} | ${getTaskStatus(task.deadline)}`)}

Create a recovery plan.

Include:

1. Short explanation of the current situation.
2. Which low priority work can safely wait.
3. Which tasks should be completed first.
4. Best execution order.
5. Estimated recovery time.
6. One short motivational paragraph.

Keep the answer under 250 words.

Use bullet points.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Gemini request failed");
      console.error("Gemini status:", response.status);
      console.error("Gemini response body:", responseText);
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const data = JSON.parse(responseText);
    console.log("Gemini successful response:", data);

    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Unable to generate rescue plan right now."
    );
  } catch (error) {
    console.error("Gemini error:", error);
    return "Unable to generate rescue plan right now.";
  }
}
