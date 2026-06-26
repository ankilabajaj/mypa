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
