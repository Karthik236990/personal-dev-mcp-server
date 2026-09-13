import { useEffect, useRef, useState } from "react";
import ChatWindow from "./components/ChatWindow.jsx";

// We keep the conversation in Gemini's native "Content" shape:
// { role: "user" | "model" | "function", parts: [{ text }] }
// so it can be sent straight back to the backend on each turn.

const WELCOME = {
  role: "model",
  parts: [
    {
      text:
        "I'm your personal dev assistant. I can read/write files, search code, " +
        "run a few whitelisted shell commands, check git status, and track todos — " +
        "all inside a sandboxed workspace folder. Try: \"list the files in my workspace\".",
    },
  ],
};

export default function App() {
  const [history, setHistory] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(() => setConnected(true))
      .catch(() => setConnected(false));
  }, []);

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    setError(null);
    const nextHistory = [...history, { role: "user", parts: [{ text }] }];
    setHistory(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: nextHistory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");

      setHistory([
        ...nextHistory,
        {
          role: "model",
          parts: [{ text: data.reply }],
          toolCalls: data.toolCalls || [],
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">▸_</span>
          <span className="brand-name">devbox</span>
        </div>
        <div className={`status ${connected ? "status-ok" : "status-down"}`}>
          <span className="status-dot" />
          {connected === null ? "checking" : connected ? "connected" : "backend offline"}
        </div>
      </header>

      <ChatWindow history={history} loading={loading} />

      {error && <div className="error-banner">{error}</div>}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
      >
        <span className="composer-prompt">&gt;</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ask devbox to read, write, search, or run something…"
          autoFocus
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? "working…" : "send"}
        </button>
      </form>
    </div>
  );
}
