import ToolCallCard from "./ToolCallCard.jsx";

export default function Message({ role, text, toolCalls }) {
  const isUser = role === "user";
  return (
    <div className={`message ${isUser ? "message-user" : "message-model"}`}>
      {!isUser && toolCalls && toolCalls.length > 0 && (
        <div className="tool-call-stack">
          {toolCalls.map((call, i) => (
            <ToolCallCard key={i} call={call} />
          ))}
        </div>
      )}
      <div className="message-bubble">
        <span className="message-role">{isUser ? "you" : "devbox"}</span>
        <p>{text}</p>
      </div>
    </div>
  );
}
