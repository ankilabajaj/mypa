import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { breakdownTask, generateDailyPlan, generateEventChecklist, generateRescuePlan, generateTodaysFocus } from "./gemini";
import { useAuth } from "./context/AuthContext";
import CollapsiblePanel from "./components/CollapsiblePanel";
import AIContent from "./components/AIContent";
import AILoadingMessage from "./components/AILoadingMessage";
import ConfettiCelebration from "./components/ConfettiCelebration";
import NotificationCenter from "./components/NotificationCenter";
import { useNotifications } from "./hooks/useNotifications";
import {
  subscribeToTasks,
  fetchTasks,
  createTask,
  updateTask,
  deleteTask as deleteTaskFromFirestore,
  fetchSettings,
  saveSettings,
  migrateFromLocalStorage,
  ensureUserExists,
  migrateSharedDataToUser,
} from "./services/firestoreService";

const isEvent = (item) => item.type === "event";
const isTask = (item) => !isEvent(item);
const getTitle = (item) => item.title || item.task || "";
const getItemDate = (item) => (isEvent(item) ? item.eventDate : item.deadline);

const formatEventDate = (dateStr) => {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

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

const getEventEndDateTime = (event) => {
  const [endHours, endMinutes] = (event.endTime || "23:59").split(":");
  const [year, month, day] = event.eventDate.split("-").map(Number);
  return new Date(
    year,
    month - 1,
    day,
    parseInt(endHours, 10),
    parseInt(endMinutes, 10),
    0,
    0
  );
};

const getEventStatus = (event) => {
  if (event.completed) return "COMPLETED";

  const today = getTodayLocal();
  const eventDay = toLocalDateOnly(event.eventDate);
  if (!eventDay) return "UPCOMING";

  if (eventDay < today) return "OVERDUE";

  if (eventDay.getTime() === today.getTime()) {
    if (new Date() > getEventEndDateTime(event)) return "OVERDUE";
    return "DUE TODAY";
  }

  const diff = Math.round((eventDay - today) / (1000 * 60 * 60 * 24));
  if (diff <= 7) return "THIS WEEK";

  return "UPCOMING";
};

const getTaskStatus = (deadline) => {
  const today = getTodayLocal();
  const due = toLocalDateOnly(deadline);
  if (!due) return "UPCOMING";

  if (due < today) return "OVERDUE";
  if (due.getTime() === today.getTime()) return "DUE TODAY";

  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff <= 7) return "THIS WEEK";

  return "UPCOMING";
};

const isItemDueToday = (item) => {
  if (item.completed) return false;
  if (isEvent(item)) return getEventStatus(item) === "DUE TODAY";
  if (isTask(item)) return getTaskStatus(item.deadline) === "DUE TODAY";
  return false;
};

const isItemOverdue = (item) => {
  if (item.completed) return false;
  if (isEvent(item)) return getEventStatus(item) === "OVERDUE";
  if (isTask(item)) return getTaskStatus(item.deadline) === "OVERDUE";
  return false;
};

const isWithinDays = (dateStr, days) => {
  const today = getTodayLocal();
  const d = toLocalDateOnly(dateStr);
  if (!d) return false;
  const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= days;
};

const isThisMonth = (dateStr) => {
  const today = new Date();
  const d = toLocalDateOnly(dateStr);
  if (!d) return false;
  return (
    d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  );
};

const isInvalidEventTimeRange = (startTime, endTime) =>
  Boolean(startTime && endTime && endTime <= startTime);

function Dashboard() {
  const { user, logout } = useAuth();
  const uid = user?.uid;
  const [task, setTask] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [itemType, setItemType] = useState("task");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [eventTimeError, setEventTimeError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [breakdowns, setBreakdowns] = useState({});
  const [visibleBreakdowns, setVisibleBreakdowns] = useState({});
  const [loadingTask, setLoadingTask] = useState(null);
  const [eventChecklists, setEventChecklists] = useState({});
  const [visibleChecklists, setVisibleChecklists] = useState({});
  const [loadingChecklistEvent, setLoadingChecklistEvent] = useState(null);
  const [dailyPlan, setDailyPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [streak, setStreak] = useState(0);
  const [lastCompletionDate, setLastCompletionDate] = useState("");
  const [rescuePlan, setRescuePlan] = useState("");
  const [rescueVisible, setRescueVisible] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [focusTask, setFocusTask] = useState(null);
  const [focusReason, setFocusReason] = useState("");
  const [completingIds, setCompletingIds] = useState(new Set());
  const [xpRewardIds, setXpRewardIds] = useState(new Set());
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const prevProductivityRef = useRef(0);
  const prevAllCompleteRef = useRef(false);
  const milestonesInitializedRef = useRef(false);
  const completionTimerRef = useRef(null);

  const {
    notifications,
    unreadCount,
    isOpen: notificationsOpen,
    toggleOpen: toggleNotifications,
    closePanel: closeNotifications,
    handleMarkRead,
    handleClearAll,
  } = useNotifications(uid, tasks);

  useEffect(() => {
    if (!uid) return;

    setSettingsLoaded(false);
    setTasks([]);
    milestonesInitializedRef.current = false;

    let cancelled = false;
    let unsubscribe = () => {};

    const start = async () => {
      await ensureUserExists(uid);
      await migrateSharedDataToUser(uid);

      const existingTasks = await fetchTasks(uid);
      if (
        !cancelled &&
        existingTasks.length === 0 &&
        localStorage.getItem("tasks")
      ) {
        await migrateFromLocalStorage(uid);
      }

      if (cancelled) return;

      const settings = await fetchSettings(uid);
      if (!cancelled) {
        setStreak(settings.streak || 0);
        setLastCompletionDate(settings.lastCompletionDate || "");
        setBreakdowns(settings.taskBreakdowns || {});
        setEventChecklists(settings.eventChecklists || {});
        setRescuePlan(settings.rescuePlan || "");
        setSettingsLoaded(true);
      }

      if (cancelled) return;

      unsubscribe = subscribeToTasks(uid, (firestoreTasks) => {
        setTasks(firestoreTasks);
      });
    };

    start();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  useEffect(() => {
    if (!settingsLoaded || !uid) return;
    saveSettings(uid, { taskBreakdowns: breakdowns });
  }, [breakdowns, settingsLoaded, uid]);

  useEffect(() => {
    if (!settingsLoaded || !uid) return;
    saveSettings(uid, { eventChecklists });
  }, [eventChecklists, settingsLoaded, uid]);

  useEffect(() => {
    if (!settingsLoaded || !uid) return;
    saveSettings(uid, { rescuePlan });
  }, [rescuePlan, settingsLoaded, uid]);

  useEffect(() => {
    let cancelled = false;

    const updateTodaysFocus = async () => {
      const fallbackTask = getTopTask();

      if (!fallbackTask) {
        setFocusTask(null);
        setFocusReason("");
        return;
      }

      setFocusTask(fallbackTask);
      setFocusReason(getFocusFallbackReason(fallbackTask));

      const result = await generateTodaysFocus(tasks);
      if (cancelled || !result) return;

      const matchedTask = resolveFocusTask(result.focus, fallbackTask);
      setFocusTask(matchedTask);
      setFocusReason(result.reason);
    };

    updateTodaysFocus();

    return () => {
      cancelled = true;
    };
  }, [tasks]);

  const addTask = () => {
    if (itemType === "task") {
      if (!task || !deadline) return;

      const newTask = {
        id: Date.now(),
        title: task,
        task,
        type: "task",
        deadline,
        priority,
        completed: false,
      };

      const updatedTasks = [...tasks, newTask];
      updatedTasks.sort(
        (a, b) => new Date(getItemDate(a)) - new Date(getItemDate(b))
      );
      setTasks(updatedTasks);
      createTask(uid, newTask);
      setTask("");
      setDeadline("");
      setPriority("Medium");
      return;
    }

    if (!task || !eventDate || !startTime || !endTime) return;

    if (isInvalidEventTimeRange(startTime, endTime)) {
      setEventTimeError("End time must be after the start time.");
      return;
    }

    const newEvent = {
      id: Date.now(),
      title: task,
      type: "event",
      eventDate,
      startTime,
      endTime,
      location,
      completed: false,
    };

    const updatedTasks = [...tasks, newEvent];
    updatedTasks.sort(
      (a, b) => new Date(getItemDate(a)) - new Date(getItemDate(b))
    );
    setTasks(updatedTasks);
    createTask(uid, newEvent);
    setTask("");
    setEventDate("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setEventTimeError("");
  };

  const deleteTask = (id) => {
    const updatedTasks = tasks.filter((t) => t.id !== id);

    updatedTasks.sort(
      (a, b) => new Date(getItemDate(a)) - new Date(getItemDate(b))
    );

    setTasks(updatedTasks);
    deleteTaskFromFirestore(uid, id);
  };

  const getStatus = (deadline) => getTaskStatus(deadline);

  const getStatusColor = (deadline) => {
    const status = getStatus(deadline);

    if (status === "OVERDUE") return "red";
    if (status === "DUE TODAY") return "orange";
    if (status === "THIS WEEK") return "gold";

    return "green";
  };

  const getTopTask = () => {
    const activeTasks = tasks.filter((task) => isTask(task) && !task.completed);

    if (activeTasks.length === 0) return null;

    const priorityScore = {
      High: 3,
      Medium: 2,
      Low: 1,
    };

    const getUrgency = (task) => {
      const status = getStatus(task.deadline);

      if (status === "OVERDUE") return 20;
      if (status === "DUE TODAY") return 10;
      if (status === "THIS WEEK") return 5;

      return 1;
    };

    return [...activeTasks].sort((a, b) => {
      const scoreA = priorityScore[a.priority] + getUrgency(a);

      const scoreB = priorityScore[b.priority] + getUrgency(b);

      return scoreB - scoreA;
    })[0];
  };

  const getFocusFallbackReason = (task) =>
    `${getPriorityLabel(task.priority)}. ${getDueInText(task.deadline)}.`;

  const resolveFocusTask = (focusTitle, fallbackTask) => {
    const normalizedFocus = focusTitle.trim().toLowerCase();
    const activeTasks = tasks.filter((task) => isTask(task) && !task.completed);

    const exactMatch = activeTasks.find(
      (task) => getTitle(task).trim().toLowerCase() === normalizedFocus
    );
    if (exactMatch) return exactMatch;

    const partialMatch = activeTasks.find((task) => {
      const title = getTitle(task).trim().toLowerCase();
      return title.includes(normalizedFocus) || normalizedFocus.includes(title);
    });
    if (partialMatch) return partialMatch;

    return fallbackTask;
  };

  const getPriorityColor = (priority) => {
    if (priority === "High") return "red";
    if (priority === "Medium") return "orange";
    return "green";
  };

  const toggleComplete = (id) => {
    const taskToToggle = tasks.find((t) => t.id === id);
    const isCompleting = taskToToggle && !taskToToggle.completed;
    const previousStreak = streak;

    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );

    setTasks(updatedTasks);
    updateTask(uid, id, { completed: !taskToToggle.completed });

    if (isCompleting) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastCompletionDate !== today) {
        const newStreak =
          lastCompletionDate === yesterdayStr ? streak + 1 : 1;

        setStreak(newStreak);
        setLastCompletionDate(today);
        saveSettings(uid, { streak: newStreak, lastCompletionDate: today });

        if (newStreak > previousStreak) {
          setConfettiTrigger((prev) => prev + 1);
        }
      }
    }
  };

  const handleCompleteClick = (id) => {
    const taskToToggle = tasks.find((t) => t.id === id);
    if (!taskToToggle || taskToToggle.completed) {
      toggleComplete(id);
      return;
    }

    setCompletingIds((prev) => new Set(prev).add(id));
    setXpRewardIds((prev) => new Set(prev).add(id));

    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
    }

    completionTimerRef.current = setTimeout(() => {
      toggleComplete(id);
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setXpRewardIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 550);
  };

  const handleConfettiDone = useCallback(() => {}, []);

  useEffect(() => {
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  const handleGeneratePlan = async () => {
    const activeItems = tasks.filter((t) => !t.completed);

    if (activeItems.length === 0) {
      setDailyPlan("No active tasks available.");
      return;
    }

    setPlanLoading(true);

    try {
      const response = await generateDailyPlan(tasks, {
        productivityScore,
        overdueCount,
        dueTodayCount,
      });
      setDailyPlan(response);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleBreakdown = async (task) => {
    if (breakdowns[task.id]) {
      setVisibleBreakdowns((prev) => ({
        ...prev,
        [task.id]: !prev[task.id],
      }));
      return;
    }

    setLoadingTask(task.id);

    try {
      const response = await breakdownTask(getTitle(task));
      setBreakdowns((prev) => ({
        ...prev,
        [task.id]: response,
      }));
      setVisibleBreakdowns((prev) => ({
        ...prev,
        [task.id]: true,
      }));
    } finally {
      setLoadingTask(null);
    }
  };

  const handleEventChecklist = async (event) => {
    if (eventChecklists[event.id]) {
      setVisibleChecklists((prev) => ({
        ...prev,
        [event.id]: !prev[event.id],
      }));
      return;
    }

    setLoadingChecklistEvent(event.id);

    try {
      const response = await generateEventChecklist(event);
      setEventChecklists((prev) => ({
        ...prev,
        [event.id]: response,
      }));
      setVisibleChecklists((prev) => ({
        ...prev,
        [event.id]: true,
      }));
    } finally {
      setLoadingChecklistEvent(null);
    }
  };

  const completedTasks = tasks.filter((task) => task.completed).length;
  const totalTasks = tasks.length;
  const productivityScore =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const filteredTasks = tasks.filter((t) => {
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const title = getTitle(t).toLowerCase();
      const itemLocation = (t.location || "").toLowerCase();
      if (!title.includes(query) && !itemLocation.includes(query)) {
        return false;
      }
    }

    if (filter === "all") return true;
    if (filter === "today") return isItemDueToday(t);
    if (filter === "this-week") {
      if (t.completed) return false;
      if (isEvent(t)) return isWithinDays(t.eventDate, 7);
      const today = getTodayLocal();
      const due = toLocalDateOnly(t.deadline);
      if (!due) return false;
      const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    }
    if (filter === "this-month") {
      const dateStr = isEvent(t) ? t.eventDate : t.deadline;
      return isThisMonth(dateStr);
    }
    if (filter === "completed") return t.completed;
    if (filter === "overdue") return isItemOverdue(t);
    return true;
  });

  const priorityOrder = {
    High: 0,
    Medium: 1,
    Low: 2,
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    const dateDiff = new Date(getItemDate(a)) - new Date(getItemDate(b));
    if (dateDiff !== 0) return dateDiff;

    if (!a.completed && !b.completed && isTask(a) && isTask(b)) {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
    }

    return 0;
  });

  const overdueCount = tasks.filter(
    (t) => isTask(t) && isItemOverdue(t)
  ).length;
  const dashboardOverdueCount = tasks.filter((t) => isItemOverdue(t)).length;
  const highPriorityIncomplete = tasks.filter(
    (t) => isTask(t) && !t.completed && t.priority === "High"
  ).length;
  const todayStr = new Date().toISOString().split("T")[0];
  const completedToday = lastCompletionDate === todayStr;
  const rescueNeeded =
    overdueCount >= 3 ||
    highPriorityIncomplete >= 5 ||
    productivityScore < 40 ||
    !completedToday;

  const handleGenerateRescuePlan = async () => {
    setRescueLoading(true);

    try {
      const response = await generateRescuePlan(tasks, productivityScore);
      setRescuePlan(response);
      setRescueVisible(true);
    } finally {
      setRescueLoading(false);
    }
  };

  const handleRegenerateRescuePlan = async () => {
    setRescueLoading(true);

    try {
      const response = await generateRescuePlan(tasks, productivityScore);
      setRescuePlan(response);
      setRescueVisible(true);
    } finally {
      setRescueLoading(false);
    }
  };

  const handleToggleRescueVisibility = () => {
    setRescueVisible((prev) => !prev);
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const getDueInText = (deadline) => {
    const today = new Date();
    const due = new Date(deadline);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      const days = Math.abs(diff);
      return `Overdue by ${days} day${days === 1 ? "" : "s"}`;
    }
    if (diff === 0) return "Due today";
    return `Due in ${diff} day${diff === 1 ? "" : "s"}`;
  };

  const getPriorityLabel = (priority) =>
    priority === "High" ? "Highest Priority" : `${priority} Priority`;

  const scrollToTask = (id) => {
    const element = document.getElementById(`task-${id}`);
    if (!element) return;

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedTaskId(id);
    setTimeout(() => setHighlightedTaskId(null), 2000);
  };

  const taskCount = tasks.filter((t) => isTask(t) && !t.completed).length;
  const eventCount = tasks.filter((t) => isEvent(t) && !t.completed).length;
  const dueTodayCount = tasks.filter((t) => isItemDueToday(t)).length;
  const eventTimeInvalid = isInvalidEventTimeRange(startTime, endTime);

  useEffect(() => {
    if (!settingsLoaded) return;

    const allComplete = totalTasks > 0 && completedTasks === totalTasks;

    if (!milestonesInitializedRef.current) {
      milestonesInitializedRef.current = true;
      prevAllCompleteRef.current = allComplete;
      prevProductivityRef.current = productivityScore;
      return;
    }

    if (allComplete && !prevAllCompleteRef.current) {
      setConfettiTrigger((prev) => prev + 1);
    }
    prevAllCompleteRef.current = allComplete;

    if (
      totalTasks > 0 &&
      productivityScore === 100 &&
      prevProductivityRef.current < 100
    ) {
      setConfettiTrigger((prev) => prev + 1);
    }
    prevProductivityRef.current = productivityScore;
  }, [settingsLoaded, completedTasks, totalTasks, productivityScore]);

  return (
    <div className="dashboard dashboard--animated">
      <ConfettiCelebration trigger={confettiTrigger} onDone={handleConfettiDone} />
      <header className="hero">
        <div className="hero__badge-wrap">
          <span className="gemini-badge">✨ Powered by Google Gemini</span>
        </div>
        <div className="hero__inner">
          <div className="hero__content">
            <h1 className="hero__title">MyPA</h1>
            <p className="hero__subtitle">
              Your AI Personal Assistant for Getting Things Done
            </p>
          </div>

          <div className="hero__aside">
            <div className="hero__aside-top">
              <NotificationCenter
                notifications={notifications}
                unreadCount={unreadCount}
                isOpen={notificationsOpen}
                onToggle={toggleNotifications}
                onClose={closeNotifications}
                onMarkRead={handleMarkRead}
                onClearAll={handleClearAll}
              />
              <div className="user-profile">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt=""
                  className="user-profile__photo"
                />
              )}
              <div className="user-profile__info">
                <span className="user-profile__name">{user.displayName}</span>
                <span className="user-profile__email">{user.email}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary user-profile__logout"
                onClick={logout}
              >
                Logout
              </button>
              </div>
            </div>

            <div className="hero__widgets">
            <div className="hero__widget">
              <span className="hero__widget-icon">🔥</span>
              <div className="hero__widget-body">
                <span className="hero__widget-label">Streak</span>
                <span className="hero__widget-value">{streak} Days</span>
              </div>
            </div>
            <div className="hero__widget">
              <span className="hero__widget-icon">⚡</span>
              <div className="hero__widget-body">
                <span className="hero__widget-label">Productivity</span>
                <span className="hero__widget-value">{productivityScore}%</span>
              </div>
            </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky-nav" aria-label="Page sections">
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "focus-section", label: "Today's Focus" },
          { id: "rescue-section", label: "AI Rescue Mode" },
          { id: "daily-planner", label: "AI Daily Planner" },
          { id: "tasks-section", label: "My Tasks" },
        ].map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="sticky-nav__link"
            onClick={() => scrollToSection(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="card task-form-card">
        <h2 className="section-title">Add Task</h2>

        <div className="task-form">
          <div className="type-selector" role="group" aria-label="Type">
            <label
              className={`type-selector__pill${itemType === "task" ? " type-selector__pill--active" : ""}`}
            >
              <input
                type="radio"
                name="itemType"
                value="task"
                checked={itemType === "task"}
                onChange={() => setItemType("task")}
                className="type-selector__input"
              />
              {itemType === "task" ? "✓ " : ""}Task
            </label>
            <label
              className={`type-selector__pill${itemType === "event" ? " type-selector__pill--active" : ""}`}
            >
              <input
                type="radio"
                name="itemType"
                value="event"
                checked={itemType === "event"}
                onChange={() => setItemType("event")}
                className="type-selector__input"
              />
              Event
            </label>
          </div>

          {itemType === "task" ? (
            <div className="task-form__grid task-form__grid--task">
              <div className="form-field">
                <label className="form-field__label" htmlFor="task-name">
                  Task Name
                </label>
                <input
                  id="task-name"
                  type="text"
                  placeholder="Task Name"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="input"
                />
              </div>

              <div className="form-field">
                <label className="form-field__label" htmlFor="task-deadline">
                  📅 Deadline
                </label>
                <input
                  id="task-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input"
                />
              </div>

              <div className="form-field">
                <label className="form-field__label" htmlFor="task-priority">
                  Priority
                </label>
                <select
                  id="task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="select"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          ) : (
            <>
              <div className="task-form__grid task-form__grid--event-row1">
                <div className="form-field">
                  <label className="form-field__label" htmlFor="event-name">
                    Event Name
                  </label>
                  <input
                    id="event-name"
                    type="text"
                    placeholder="Event Name"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    className="input"
                  />
                </div>

                <div className="form-field">
                  <label className="form-field__label" htmlFor="event-date">
                    📅 Event Date
                  </label>
                  <input
                    id="event-date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="input"
                  />
                </div>

                <div className="form-field">
                  <label className="form-field__label" htmlFor="event-start">
                    🕒 Start Time
                  </label>
                  <input
                    id="event-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStartTime(value);
                      setEventTimeError(
                        isInvalidEventTimeRange(value, endTime)
                          ? "End time must be after the start time."
                          : ""
                      );
                    }}
                    className="input"
                  />
                </div>
              </div>

              <div className="task-form__grid task-form__grid--event-row2">
                <div className="form-field">
                  <label className="form-field__label" htmlFor="event-end">
                    🕒 End Time
                  </label>
                  <input
                    id="event-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEndTime(value);
                      setEventTimeError(
                        isInvalidEventTimeRange(startTime, value)
                          ? "End time must be after the start time."
                          : ""
                      );
                    }}
                    className="input"
                  />
                </div>

                {eventTimeError && (
                  <p className="form-field__error" role="alert">
                    {eventTimeError}
                  </p>
                )}

                <div className="form-field">
                  <label className="form-field__label" htmlFor="event-location">
                    📍 Location
                  </label>
                  <input
                    id="event-location"
                    type="text"
                    placeholder="Location (optional)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </>
          )}

          <div className="task-form__actions">
            <button
              onClick={addTask}
              className="btn btn-primary task-form__submit"
              disabled={itemType === "event" && eventTimeInvalid}
            >
              {itemType === "task" ? "Add Task" : "Add Event"}
            </button>
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section id="dashboard" className="stats-grid animate-section">
        <div className="stat-card" style={{ "--stagger-index": 0 }}>
          <h3 className="stat-card__number">{taskCount}</h3>
          <p className="stat-card__label">Tasks</p>
        </div>

        <div className="stat-card" style={{ "--stagger-index": 1 }}>
          <h3 className="stat-card__number">{eventCount}</h3>
          <p className="stat-card__label">Events</p>
        </div>

        <div className="stat-card" style={{ "--stagger-index": 2 }}>
          <h3 className="stat-card__number stat-card__number--danger">
            {dashboardOverdueCount}
          </h3>
          <p className="stat-card__label">Overdue</p>
        </div>

        <div className="stat-card" style={{ "--stagger-index": 3 }}>
          <h3 className="stat-card__number stat-card__number--warning">
            {dueTodayCount}
          </h3>
          <p className="stat-card__label">Due Today</p>
        </div>
      </section>

      <section id="focus-section" className="focus-section animate-section">
        <h2 className="section-title">Today's Focus</h2>

        <div className="focus-card">
          {focusTask ? (
            <>
              <div className="focus-card__icon">🎯</div>
              <p className="focus-card__heading">Today's Focus</p>
              <strong className="focus-card__task-name">
                Complete {getTitle(focusTask)}
              </strong>
              <p className="focus-card__detail">{focusReason}</p>
              <button
                type="button"
                className="btn btn-secondary focus-card__view-btn"
                onClick={() => scrollToTask(focusTask.id)}
              >
                View Task
              </button>
            </>
          ) : (
            <strong className="focus-card__text">No tasks added yet</strong>
          )}
        </div>
      </section>

      <section id="rescue-section" className="rescue-section animate-section">
        <h2 className="section-title rescue-title">🚨 AI Rescue Mode</h2>

        {rescueNeeded ? (
          <div className="rescue-card">
            <p className="rescue-text rescue-text--status">
              Status: You're falling behind.
            </p>

            <div className="rescue-card__stats">
              <span className="rescue-card__stat">
                {overdueCount} overdue task{overdueCount === 1 ? "" : "s"}
              </span>
              <span className="rescue-card__stat">
                {productivityScore}% productivity
              </span>
            </div>

            {!rescuePlan ? (
              <button
                onClick={handleGenerateRescuePlan}
                className="btn rescue-button"
                disabled={rescueLoading}
              >
                {rescueLoading ? "Generating..." : "Generate Recovery Plan"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleToggleRescueVisibility}
                  className="btn rescue-button"
                >
                  {rescueVisible ? "Hide Recovery Plan" : "Show Recovery Plan"}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateRescuePlan}
                  className="btn rescue-button"
                  disabled={rescueLoading}
                >
                  {rescueLoading
                    ? "Generating..."
                    : "Regenerate Recovery Plan"}
                </button>
              </>
            )}

            {rescueLoading && (
              <AILoadingMessage message="✨ Gemini is creating your recovery plan..." />
            )}

            <CollapsiblePanel
              open={rescueVisible && !!rescuePlan}
              className="rescue-card__plan-collapsible"
            >
              <div className="rescue-card__plan">
                <AIContent>{rescuePlan}</AIContent>
              </div>
            </CollapsiblePanel>
          </div>
        ) : (
          <div className="rescue-card rescue-card--on-track">
            <p className="rescue-text">
              🎉 You're on track!
              <br />
              No rescue plan needed today.
              <br />
              Keep it up!
            </p>
          </div>
        )}
      </section>

      <hr className="divider" />

      <section id="daily-planner" className="recommendation-section daily-planner-section animate-section">
        <h2 className="section-title">✨ AI Daily Planner</h2>

        <CollapsiblePanel open={!!dailyPlan} className="daily-planner-collapsible">
          <div className="recommendation-card daily-planner-card">
            <AIContent title="Generated Daily Plan">{dailyPlan}</AIContent>
          </div>
        </CollapsiblePanel>

        {planLoading && (
          <AILoadingMessage message="✨ Gemini is planning your day..." />
        )}

        <button
          onClick={handleGeneratePlan}
          className="btn btn-primary daily-planner-button"
          disabled={planLoading}
        >
          {planLoading
            ? "Generating Plan..."
            : dailyPlan
              ? "🔄 Regenerate Plan"
              : "✨ Generate Today's Plan"}
        </button>
      </section>

      <hr className="divider" />

      <section id="tasks-section" className="tasks-section animate-section">
        <input
          type="text"
          placeholder="🔍 Search tasks or events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input task-search"
        />

        <div className="task-filters">
          {[
            { key: "all", label: "All" },
            { key: "today", label: "Today" },
            { key: "this-week", label: "This Week" },
            { key: "this-month", label: "This Month" },
            { key: "completed", label: "Completed" },
            { key: "overdue", label: "Overdue" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`btn btn-secondary task-filters__btn${filter === key ? " task-filters__btn--active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>

        <h2 className="section-title">My Tasks ({filteredTasks.length})</h2>

        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🎉</div>
            <h3 className="empty-state__title">You're all caught up!</h3>
            <p className="empty-state__message">Add a task to get started.</p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state__title">No matching tasks or events.</h3>
          </div>
        ) : (
          sortedTasks.map((t, index) =>
            isEvent(t) ? (
              <div
                key={t.id}
                id={`task-${t.id}`}
                className={`task-card-wrapper${completingIds.has(t.id) ? " task-card-wrapper--completing" : ""}`}
                style={{ "--card-index": index }}
              >
                <div
                  className={`task-card event-card${completingIds.has(t.id) ? " task-card--completing" : ""}${t.completed ? " task-card--completed" : ""}${highlightedTaskId === t.id ? " task-card--highlighted" : ""}`}
                >
                <div className="task-card__header">
                  <span className="item-type-badge item-type-badge--event">EVENT</span>
                  <h3 className="task-card__title">{getTitle(t)}</h3>
                </div>
                <p className="task-card__meta">📅 {formatEventDate(t.eventDate)}</p>
                <p className="task-card__meta">
                  🕒 {formatTime(t.startTime)} - {formatTime(t.endTime)}
                </p>
                {t.location && (
                  <p className="task-card__meta">📍 {t.location}</p>
                )}

                <div className="task-card__badges">
                  <span
                    className={`badge badge-status badge-status--${getEventStatus(t).toLowerCase().replace(/ /g, "-")}`}
                  >
                    Status: {getEventStatus(t)}
                  </span>
                </div>

                <div className="task-card__actions">
                  <button
                    onClick={() => handleCompleteClick(t.id)}
                    className="btn btn-secondary"
                    disabled={completingIds.has(t.id)}
                  >
                    {t.completed ? "Undo" : "Complete"}
                  </button>

                  <button
                    onClick={() => deleteTask(t.id)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => handleEventChecklist(t)}
                    className="btn btn-secondary"
                    disabled={loadingChecklistEvent === t.id}
                  >
                    {loadingChecklistEvent === t.id
                      ? "Generating..."
                      : eventChecklists[t.id]
                        ? visibleChecklists[t.id]
                          ? "👁 Hide Checklist"
                          : "👁 Show Checklist"
                        : "✨ Generate Event Checklist"}
                  </button>
                </div>

                {loadingChecklistEvent === t.id && (
                  <AILoadingMessage message="✨ Gemini is preparing your event checklist..." />
                )}

                <CollapsiblePanel
                  open={visibleChecklists[t.id] && !!eventChecklists[t.id]}
                >
                  <AIContent title="Event Checklist">{eventChecklists[t.id]}</AIContent>
                </CollapsiblePanel>
                </div>
                {xpRewardIds.has(t.id) && (
                  <span className="xp-reward" aria-hidden="true">✨ +10 XP</span>
                )}
              </div>
            ) : (
              <div
                key={t.id}
                className={`task-card-wrapper${completingIds.has(t.id) ? " task-card-wrapper--completing" : ""}`}
                style={{ "--card-index": index }}
              >
                <div
                  id={`task-${t.id}`}
                  className={`task-card${focusTask?.id === t.id ? " task-card--top" : ""}${completingIds.has(t.id) ? " task-card--completing" : ""}${t.completed ? " task-card--completed" : ""}${highlightedTaskId === t.id ? " task-card--highlighted" : ""}`}
                >
                <div className="task-card__header">
                  <span className="item-type-badge item-type-badge--task">TASK</span>
                  <h3 className="task-card__title">{getTitle(t)}</h3>
                </div>
                <p className="task-card__meta">📅 Deadline: {t.deadline}</p>

                <div className="task-card__badges">
                  <span
                    className={`badge badge-priority badge-priority--${t.priority.toLowerCase()}`}
                  >
                    Priority: {t.priority}
                  </span>

                  <span
                    className={`badge badge-status badge-status--${getStatus(t.deadline).toLowerCase().replace(/ /g, "-")}`}
                  >
                    Status: {getStatus(t.deadline)}
                  </span>
                </div>

                <div className="task-card__actions">
                  <button
                    onClick={() => handleCompleteClick(t.id)}
                    className="btn btn-secondary"
                    disabled={completingIds.has(t.id)}
                  >
                    {t.completed ? "Undo" : "Complete"}
                  </button>

                  <button
                    onClick={() => deleteTask(t.id)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => handleBreakdown(t)}
                    className="btn btn-secondary"
                    disabled={loadingTask === t.id}
                  >
                    {loadingTask === t.id
                      ? "Generating..."
                      : breakdowns[t.id]
                        ? visibleBreakdowns[t.id]
                          ? "✨ Hide Breakdown"
                          : "✨ Show Breakdown"
                        : "✨ Break Down Task"}
                  </button>
                </div>

                {loadingTask === t.id && (
                  <AILoadingMessage message="✨ Gemini is breaking this task into steps..." />
                )}

                <CollapsiblePanel
                  open={visibleBreakdowns[t.id] && !!breakdowns[t.id]}
                >
                  <AIContent title="AI Breakdown">{breakdowns[t.id]}</AIContent>
                </CollapsiblePanel>
                </div>
                {xpRewardIds.has(t.id) && (
                  <span className="xp-reward" aria-hidden="true">✨ +10 XP</span>
                )}
              </div>
            )
          )
        )}
      </section>

      <hr className="divider" />

      <footer className="footer">
        <p className="footer__text">
          Built for Vibe2Ship Hackathon • MyPA
        </p>
      </footer>
    </div>
  );
}

export default Dashboard;
