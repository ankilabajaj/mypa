import { useState, useEffect } from "react";
import "./App.css";
import { breakdownTask, generateDailyPlan } from "./gemini";

function App() {
  const [task, setTask] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("Medium");
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

  useEffect(() => {
    const savedTasks = JSON.parse(localStorage.getItem("tasks")) || [];
    setTasks(savedTasks);
    const savedStreak = parseInt(localStorage.getItem("streak"), 10) || 0;
    setStreak(savedStreak);
    const savedBreakdowns =
      JSON.parse(localStorage.getItem("taskBreakdowns")) || {};
    setBreakdowns(savedBreakdowns);
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
    prioritizeTasks();
  }, [tasks]);

  const addTask = () => {
    if (!task || !deadline) return;

    const newTask = {
      id: Date.now(),
      task,
      deadline,
      priority,
      completed: false,
    };

    const updatedTasks = [...tasks, newTask];

    updatedTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    setTasks(updatedTasks);

    setTask("");
    setDeadline("");
    setPriority("Medium");
  };

  const deleteTask = (id) => {
    const updatedTasks = tasks.filter((t) => t.id !== id);

    updatedTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    setTasks(updatedTasks);
  };

  const prioritizeTasks = () => {
    const topTask = getTopTask();

    if (!topTask) {
      setRecommendation("No tasks available.");
      return;
    }

    setRecommendation(
      `Focus on "${topTask.task}" because it is ${
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
    const activeTasks = tasks.filter((task) => !task.completed);

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
    const activeTasks = tasks.filter((t) => !t.completed);

    if (activeTasks.length === 0) {
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
      const response = await breakdownTask(task.task);
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
    if (filter === "all") return true;
    if (filter === "today") return getStatus(t.deadline) === "DUE TODAY";
    if (filter === "this-week") {
      const today = new Date();
      const due = new Date(t.deadline);
      const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 7;
    }
    if (filter === "this-month") {
      const today = new Date();
      const due = new Date(t.deadline);
      return (
        due.getMonth() === today.getMonth() &&
        due.getFullYear() === today.getFullYear()
      );
    }
    if (filter === "completed") return t.completed;
    if (filter === "overdue")
      return !t.completed && getStatus(t.deadline) === "OVERDUE";
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

    if (!a.completed && !b.completed) {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
    }

    return new Date(a.deadline) - new Date(b.deadline);
  });

  return (
    <div className="dashboard">
      <header className="hero">
        <div className="hero__stats">
          <span className="hero__stat">🔥 Streak: {streak}</span>
          <span className="hero__stat">⚡ Productivity: {productivityScore}%</span>
        </div>
        <h1 className="hero__title">MyPA</h1>
        <p className="hero__subtitle">
          Your AI Personal Assistant for Getting Things Done
        </p>
      </header>

      <section className="card task-form-card">
        <h2 className="section-title">Add Task</h2>

        <div className="task-form">
          <input
            type="text"
            placeholder="Task Name"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            className="input"
          />

          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="input"
          />

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="select"
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <button onClick={addTask} className="btn btn-primary">
            Add Task
          </button>
        </div>
      </section>

      <hr className="divider" />

      <section className="stats-grid">
        <div className="stat-card">
          <h3 className="stat-card__number">
            {tasks.filter((t) => !t.completed).length}
          </h3>
          <p className="stat-card__label">Total Tasks</p>
        </div>

        <div className="stat-card">
          <h3 className="stat-card__number stat-card__number--danger">
            {
              tasks.filter(
                (t) => !t.completed && getStatus(t.deadline) === "OVERDUE"
              ).length
            }
          </h3>
          <p className="stat-card__label">Overdue</p>
        </div>

        <div className="stat-card">
          <h3 className="stat-card__number stat-card__number--warning">
            {
              tasks.filter(
                (t) => !t.completed && getStatus(t.deadline) === "DUE TODAY"
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
            {topTask ? `Focus on: ${topTask.task}` : "No tasks added yet"}
          </strong>
        </div>
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
        ) : (
          sortedTasks.map((t) => (
            <div
              key={t.id}
              className={`task-card${topTask?.id === t.id ? " task-card--top" : ""}${t.completed ? " task-card--completed" : ""}`}
            >
              <h3 className="task-card__title">{t.task}</h3>
              <p className="task-card__meta">Deadline: {t.deadline}</p>

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
          ))
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
