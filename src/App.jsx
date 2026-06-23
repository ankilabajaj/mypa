import { useState, useEffect } from "react";

function App() {
  const [task, setTask] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const savedTasks = JSON.parse(localStorage.getItem("tasks")) || [];
    setTasks(savedTasks);
  }, []);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (!task || !deadline) return;

    const newTask = {
      id: Date.now(),
      task,
      deadline,
      priority,
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

  return (
    <div
      style={{
        padding: "30px",
        maxWidth: "900px",
        margin: "auto",
        textAlign: "center",
      }}
    >
      <h1>MyPA</h1>
      <p>Your AI Personal Assistant for Getting Things Done</p>

      <h2>Add Task</h2>

      <input
        type="text"
        placeholder="Task Name"
        value={task}
        onChange={(e) => setTask(e.target.value)}
      />

      <br />
      <br />

      <input
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
      />

      <br />
      <br />

      <select value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>

      <br />
      <br />

      <button onClick={addTask}>Add Task</button>

      <hr />
      <h2>Today's Focus</h2>

      <div
        style={{
          backgroundColor: "#f5f5f5",
          padding: "15px",
          borderRadius: "10px",
          marginBottom: "20px",
        }}
      >
        <strong>
          {tasks.length > 0
            ? `🎯 Focus on: ${tasks[0].task}`
            : "No tasks added yet"}
        </strong>
      </div>

      <hr />

      <h2>My Tasks ({tasks.length})</h2>

      {tasks.map((t) => (
        <div
          key={t.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "15px",
            boxShadow: "0px 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h3>{t.task}</h3>
          <p>Deadline: {t.deadline}</p>

          <p>Priority: {t.priority}</p>

          <p
            style={{
              color: getStatusColor(t.deadline),
              fontWeight: "bold",
            }}
          >
            Status: {getStatus(t.deadline)}
          </p>

          <button onClick={() => deleteTask(t.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

export default App;
