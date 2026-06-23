import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [task, setTask] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [tasks, setTasks] = useState([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [recommendation, setRecommendation] = useState("");

  useEffect(() => {
    const savedTasks = JSON.parse(localStorage.getItem("tasks")) || [];
    setTasks(savedTasks);
    setTasksLoaded(true);
  }, []);

  useEffect(() => {
    if (!tasksLoaded) return;
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks, tasksLoaded]);

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
    const updatedTasks = tasks.map((task) =>
      task.id === id ? { ...task, completed: !task.completed } : task
    );

    setTasks(updatedTasks);
  };

  return (
    <div className="dashboard">
      <header className="hero">
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

      <section className="tasks-section">
        <h2 className="section-title">
          My Tasks ({tasks.filter((t) => !t.completed).length})
        </h2>

        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🎉</div>
            <h3 className="empty-state__title">You're all caught up!</h3>
            <p className="empty-state__message">Add a task to get started.</p>
          </div>
        ) : (
          tasks.map((t) => (
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
              </div>
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
