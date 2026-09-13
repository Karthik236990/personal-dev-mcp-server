import { useEffect, useRef } from "react";
import Message from "./Message.jsx";

export default function ChatWindow({ history, loading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  // Only user/model turns are rendered as chat bubbles. "function" turns are
  // internal (tool results fed back to Gemini) and shown via the model
  // message's own toolCalls list instead, so nothing is duplicated.
  const visibleTurns = history.filter((h) => h.role === "user" || h.role === "model");

  return (
    <main className="chat-window">
      {visibleTurns.map((turn, i) => (
        <Message key={i} role={turn.role} text={turn.parts?.[0]?.text} toolCalls={turn.toolCalls} />
      ))}
      {loading && (
        <div className="message message-model">
          <div className="message-bubble typing">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </main>
  );
}
