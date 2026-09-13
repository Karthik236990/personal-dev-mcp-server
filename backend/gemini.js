// gemini.js
// Minimal wrapper around Google's Gemini API (generativelanguage.googleapis.com)
// using plain fetch — no SDK dependency required.

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function toGeminiTools(tools) {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];
}

/**
 * Send the running conversation + tool declarations to Gemini.
 * `history` is an array of Gemini "Content" objects: { role, parts }.
 */
export async function callGemini({ history, tools, systemInstruction }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Copy backend/.env.example to backend/.env and add your key."
    );
  }

  const body = {
    contents: history,
    tools: toGeminiTools(tools),
    systemInstruction: systemInstruction
      ? { role: "system", parts: [{ text: systemInstruction }] }
      : undefined,
  };

  const res = await fetch(
    `${API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error("Gemini returned no candidates: " + JSON.stringify(data));
  }
  return candidate.content; // { role: "model", parts: [...] }
}
