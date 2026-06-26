import { useState, useEffect } from "react";
import "./App.css";
import { breakdownTask, generateDailyPlan, generateRescuePlan } from "./gemini";

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

const isSameDay = (dateStr) => {
  const today = new Date();
  const d = new Date(`${dateStr}T00:00:00`);
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

const isWithinDays = (dateStr, days) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStr}T00:00:00`);
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= days;
};

const isThisMonth = (dateStr) => {
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  );
};

function App() {
  const [task, setTask] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [itemType, setItemType] = useState("task");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  const [breakdowns, setBreakdowns] = useState({});
  const [visibleBreakdowns, setVisibleBreakdowns] = useState({});
  const [loadingTask, setLoadingTask] = useState(null);
  const [dailyPlan, setDailyPlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [streak, setStreak] = useState(0);
  const [rescuePlan, setRescuePlan] = useState("");
  const [rescueVisible, setRescueVisible] = useState(false);
  const [rescueLoading, setRescueLoading] = useState(false);

  useEffect(() => {
    const savedTasks = (JSON.parse(localStorage.getItem("tasks")) || []).map(
      (item) => ({
        ...item,
        type: item.type || "task",
        title: item.title || item.task,
      })
    );
    setTasks(savedTasks);
    const savedStreak = parseInt(localStorage.getItem("streak"), 10) || 0;
    setStreak(savedStreak);
    const savedBreakdowns =
      JSON.parse(localStorage.getItem("taskBreakdowns")) || {};
    setBreakdowns(savedBreakdowns);
    const savedRescuePlan = localStorage.getItem("rescuePlan") || "";
    setRescuePlan(savedRescuePlan);
    setTasksLoaded(true);
  }, []);

  useEffect(() => {
    if (!tasksLoaded) return;
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks, tasksLoaded]);

  useEffect(() => {
    if (!tasksLoaded) return;
    localStorage.setItem("taskBreakdowns", JSON.stringify(breakdowns));
  }, [breakdowns, tasksLoaded]);

  useEffect(() => {
    if (!tasksLoaded) return;
    localStorage.setItem("rescuePlan", rescuePlan);
  }, [rescuePlan, tasksLoaded]);

  useEffect(() => {
    prioritizeTasks();
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
      setTask("");
      setDeadline("");
      setPriority("Medium");
      return;
    }

    if (!task || !eventDate || !startTime || !endTime) return;

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
    setTask("");
    setEventDate("");
    setStartTime("");
    setEndTime("");
    setLocation("");
  };

  const deleteTask = (id) => {
    const updatedTasks = tasks.filter((t) => t.id !== id);

    updatedTasks.sort(
      (a, b) => new Date(getItemDate(a)) - new Date(getItemDate(b))
    );

    setTasks(updatedTasks);
  };

  const prioritizeTasks = () => {
    const topTask = getTopTask();

    if (!topTask) {
      setRecommendation("No tasks available.");
      return;
    }

    setRecommendation(
      `Focus on "${getTitle(topTask)}" because it is ${
        topTask.priority
      } priority and currently ${getStatus(topTask.deadline)}.`
    );
  };

  const getStatus = (deadline) => {
    const today = new Date();
    const due = new Date(deadline);

    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return "OVERDUE";
    if (diff === 0) return "DUE TODAY";
    if (diff <= 7) return "THIS WEEK";

    return "UPCOMING";
  };

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

  const topTask = getTopTask();

  const getPriorityColor = (priority) => {
    if (priority === "High") return "red";
    if (priority === "Medium") return "orange";
    return "green";
  };

  const toggleComplete = (id) => {
    const taskToToggle = tasks.find((t) => t.id === id);
    const isCompleting = taskToToggle && !taskToToggle.completed;

    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );

    setTasks(updatedTasks);

    if (isCompleting) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const lastCompletionDate = localStorage.getItem("lastCompletionDate");

      if (lastCompletionDate !== today) {
        const currentStreak = parseInt(localStorage.getItem("streak"), 10) || 0;
        const newStreak =
          lastCompletionDate === yesterdayStr ? currentStreak + 1 : 1;

        setStreak(newStreak);
        localStorage.setItem("streak", newStreak.toString());
        localStorage.setItem("lastCompletionDate", today);
      }
    }
  };

  const handleGeneratePlan = async () => {
    const activeItems = tasks.filter((t) => !t.completed);

    if (activeItems.length === 0) {
      setDailyPlan("No active tasks available.");
      return;
    }

    setPlanLoading(true);

    try {
      const response = await generateDailyPlan(tasks);
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
    if (filter === "today") {
      if (isEvent(t)) return isSameDay(t.eventDate);
      return getStatus(t.deadline) === "DUE TODAY";
    }
    if (filter === "this-week") {
      if (isEvent(t)) return isWithinDays(t.eventDate, 7);
      const today = new Date();
      const due = new Date(t.deadline);
      const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    }
    if (filter === "this-month") {
      const dateStr = isEvent(t) ? t.eventDate : t.deadline;
      return isThisMonth(dateStr);
    }
    if (filter === "completed") return t.completed;
    if (filter === "overdue")
      return isTask(t) && !t.completed && getStatus(t.deadline) === "OVERDUE";
    return true;
  });

  const priorityOrder = {
    High: 0,
    Medium: 1,
    Low: 2,
  };

  const getSortGroup = (item) => {
    if (isEvent(item)) return item.completed ? 3 : 1;
    if (item.completed) return 2;
    return 0;
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const groupA = getSortGroup(a);
    const groupB = getSortGroup(b);
    if (groupA !== groupB) return groupA - groupB;

    if (!a.completed && !b.completed && isTask(a) && isTask(b)) {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
    }

    return new Date(getItemDate(a)) - new Date(getItemDate(b));
  });

  const overdueCount = tasks.filter(
    (t) =>
      isTask(t) && !t.completed && getStatus(t.deadline) === "OVERDUE"
  ).length;
  const highPriorityIncomplete = tasks.filter(
    (t) => isTask(t) && !t.completed && t.priority === "High"
  ).length;
  const todayStr = new Date().toISOString().split("T")[0];
  const completedToday = localStorage.getItem("lastCompletionDate") === todayStr;
  const rescueNeeded =
    overdueCount >= 3 ||
    highPriorityIncomplete >= 5 ||
    productivityScore < 40 ||
    !completedToday;

  const handleRescuePlan = async () => {
    if (rescuePlan) {
      setRescueVisible((prev) => !prev);
      return;
    }

    setRescueLoading(true);

    try {
      const response = await generateRescuePlan(tasks, productivityScore);
      setRescuePlan(response);
      setRescueVisible(true);
    } finally {
      setRescueLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="hero">
        <div className="hero__stats">
          <div className="hero__stat-card">
            <span className="hero__stat-label">🔥 Streak</span>
            <span className="hero__stat-value">{streak} Days</span>
          </div>
          <div className="hero__stat-card">
            <span className="hero__stat-label">⚡ Productivity</span>
            <span className="hero__stat-value">{productivityScore}%</span>
          </div>
        </div>
        <h1 className="hero__title">MyPA</h1>
        <p className="hero__subtitle">
          Your AI Personal Assistant for Getting Things Done
        </p>
      </header>

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
                    onChange={(e) => setStartTime(e.target.value)}
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
                    onChange={(e) => setEndTime(e.target.value)}
                    className="input"
                  />
                </div>

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
            <button onClick={addTask} className="btn btn-primary task-form__submit">
              {itemType === "task" ? "Add Task" : "Add Event"}
            </button>
          </div>
        </div>
      </section>

      <hr className="divider" />

      <section className="stats-grid">
        <div className="stat-card">
          <h3 className="stat-card__number">
            {tasks.filter((t) => isTask(t) && !t.completed).length}
          </h3>
          <p className="stat-card__label">Total Tasks</p>
        </div>

        <div className="stat-card">
          <h3 className="stat-card__number stat-card__number--danger">
            {
              tasks.filter(
                (t) =>
                  isTask(t) &&
                  !t.completed &&
                  getStatus(t.deadline) === "OVERDUE"
              ).length
            }
          </h3>
          <p className="stat-card__label">Overdue</p>
        </div>

        <div className="stat-card">
          <h3 className="stat-card__number stat-card__number--warning">
            {
              tasks.filter(
                (t) =>
                  isTask(t) &&
                  !t.completed &&
                  getStatus(t.deadline) === "DUE TODAY"
              ).length
            }
          </h3>
          <p className="stat-card__label">Due Today</p>
        </div>
      </section>

      <section className="focus-section">
        <h2 className="section-title">Today's Focus</h2>

        <div className="focus-card">
          {topTask && <div className="focus-card__icon">🎯</div>}
          <strong className="focus-card__text">
            {topTask ? `Focus on: ${getTitle(topTask)}` : "No tasks added yet"}
          </strong>
        </div>
      </section>

      <section className="rescue-section">
        <h2 className="section-title rescue-title">🚨 AI Rescue Mode</h2>

        {rescueNeeded ? (
          <div className="rescue-card">
            <p className="rescue-text">
              You're falling behind.
              <br />
              AI has prepared a recovery plan.
            </p>

            <button
              onClick={handleRescuePlan}
              className="btn rescue-button"
              disabled={rescueLoading}
            >
              {rescueLoading
                ? "Generating..."
                : rescuePlan
                  ? rescueVisible
                    ? "🙈 Hide Rescue Plan"
                    : "👀 Show Rescue Plan"
                  : "🚨 Generate Rescue Plan"}
            </button>

            {rescueVisible && rescuePlan && (
              <div className="rescue-card__plan">
                <pre className="rescue-text">{rescuePlan}</pre>
              </div>
            )}
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

      {recommendation && (
        <>
          <section className="recommendation-section">
            <h2 className="section-title">🧠 Smart Recommendation</h2>

            <div className="recommendation-card">
              <p className="recommendation-card__text">{recommendation}</p>
            </div>
          </section>

          <hr className="divider" />
        </>
      )}

      <section className="recommendation-section">
        <h2 className="section-title">✨ AI Daily Planner</h2>

        <button
          onClick={handleGeneratePlan}
          className="btn btn-primary"
          disabled={planLoading}
        >
          {planLoading
            ? "Generating Plan..."
            : dailyPlan
              ? "🔄 Regenerate Plan"
              : "✨ Generate Today's Plan"}
        </button>

        {dailyPlan && (
          <div className="recommendation-card">
            <strong>Generated Daily Plan</strong>
            <pre className="recommendation-card__text">{dailyPlan}</pre>
          </div>
        )}
      </section>

      <hr className="divider" />

      <section className="tasks-section">
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
          sortedTasks.map((t) =>
            isEvent(t) ? (
              <div
                key={t.id}
                className={`task-card event-card${t.completed ? " task-card--completed" : ""}`}
              >
                <div className="task-card__header">
                  <span className="item-type-badge item-type-badge--event">EVENT</span>
                  <h3 className="task-card__title">🎉 {getTitle(t)}</h3>
                </div>
                <p className="task-card__meta">📅 {formatEventDate(t.eventDate)}</p>
                <p className="task-card__meta">
                  🕒 {formatTime(t.startTime)} - {formatTime(t.endTime)}
                </p>
                {t.location && (
                  <p className="task-card__meta">📍 {t.location}</p>
                )}

                <div className="task-card__actions">
                  <button
                    onClick={() => toggleComplete(t.id)}
                    className="btn btn-secondary"
                  >
                    {t.completed ? "Undo" : "Complete"}
                  </button>

                  <button
                    onClick={() => deleteTask(t.id)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={t.id}
                className={`task-card${topTask?.id === t.id ? " task-card--top" : ""}${t.completed ? " task-card--completed" : ""}`}
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
                    onClick={() => toggleComplete(t.id)}
                    className="btn btn-secondary"
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
                  <p className="task-card__meta">Generating AI breakdown...</p>
                )}

                {visibleBreakdowns[t.id] && breakdowns[t.id] && (
                  <div className="task-card__meta">
                    <strong>AI Breakdown</strong>
                    <pre>{breakdowns[t.id]}</pre>
                  </div>
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

export default App;
