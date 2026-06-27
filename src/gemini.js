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

  const prompt = `You are an AI productivity assistant.

Based on the user's current time and pending tasks, choose the SINGLE most important task they should focus on right now.

Consider:
- urgency
- priority
- deadlines
- overdue tasks
- current time of day
- overall productivity impact

Current date: ${currentDate}
Current local time: ${currentTime}
Current day of week: ${dayOfWeek}

Incomplete tasks:
${taskList}

Return ONLY valid JSON in this exact format with no markdown, no code fences, and no additional text:
{"focus":"Task title exactly as listed","reason":"Brief explanation of why this task should be the focus right now"}`;

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

export async function generateDailyPlan(tasks) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = "gemini-3.1-flash-lite";

  console.log("Gemini model:", model);
  console.log("Gemini API key detected:", Boolean(apiKey));

  if (!apiKey) {
    return "Gemini API key not found.";
  }

  const getTitle = (item) => item.title || item.task || "";

  const formatEventDate = (dateStr) => {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  };

  const activeItems = tasks.filter((item) => !item.completed);
  const activeEvents = activeItems.filter((item) => item.type === "event");
  const activeTasks = activeItems.filter((item) => item.type !== "event");

  const eventList = activeEvents
    .map(
      (event) =>
        `EVENT\n\n${getTitle(event)}\n\n${formatEventDate(event.eventDate)}\n\n${event.startTime}-${event.endTime}`
    )
    .join("\n\n");

  const taskList = activeTasks
    .map(
      (task) =>
        `TASK\n\n${getTitle(task)}\n\n${task.priority}\n\n${getTaskStatus(task.deadline)}`
    )
    .join("\n\n");

  const itemsList = [eventList, taskList].filter(Boolean).join("\n\n");

  const prompt = `You are a productivity assistant.

Here are my pending items:

${itemsList}

Create an optimized schedule for today.

Return only a clean schedule using bullet points.

Include estimated times and logical ordering.`;

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
