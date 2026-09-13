// server.js
// Express API that powers the chat frontend. Runs the classic
// function-calling loop: send the conversation + tool schemas to Gemini ->
// if Gemini asks for a tool call, run it locally -> feed the result back ->
// repeat until Gemini responds with plain text.

import "dotenv/config";
import express from "express";
import cors from "cors";
import { callGemini } from "./gemini.js";
import { tools, callTool } from "./tools/index.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 8787;

const SYSTEM_INSTRUCTION = `You are a personal developer assistant with real
tool access to a sandboxed local workspace folder. Use the available tools
whenever a request requires reading, writing, searching, or running things
in that workspace — don't just describe what you would do, actually call the
tools. Be concise in your final answers. When a tool call fails, explain the
error briefly and suggest a fix.`;

const MAX_TOOL_ITERATIONS = 8;

app.post("/api/chat", async (req, res) => {
  try {
    const { history } = req.body;
    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ error: "Request body must include a non-empty `history` array." });
    }

    // Working copy of the conversation we'll keep extending as tool calls
    // happen, so we can report every intermediate step to the frontend.
    const conversation = [...history];
    const toolCallLog = [];

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const modelContent = await callGemini({
        history: conversation,
        tools,
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      conversation.push(modelContent);

      const functionCalls = (modelContent.parts || []).filter((p) => p.functionCall);

      if (functionCalls.length === 0) {
        // Plain text answer — we're done.
        const text = (modelContent.parts || [])
          .map((p) => p.text)
          .filter(Boolean)
          .join("\n");
        return res.json({ reply: text, toolCalls: toolCallLog });
      }

      // Execute every requested tool call and feed results back as a
      // single "function" turn (Gemini supports batching these).
      const responseParts = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall;
        let result;
        try {
          result = await callTool(name, args);
        } catch (err) {
          result = { error: err.message };
        }
        toolCallLog.push({ name, args, result });
        responseParts.push({
          functionResponse: { name, response: result },
        });
      }
      conversation.push({ role: "function", parts: responseParts });
    }

    return res.status(500).json({
      error: `Stopped after ${MAX_TOOL_ITERATIONS} tool-call rounds without a final answer.`,
      toolCalls: toolCallLog,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/tools", (req, res) => {
  res.json({
    tools: tools.map((t) => ({ name: t.name, description: t.description })),
  });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Workspace tools sandboxed to: backend/workspace/`);
});
