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
