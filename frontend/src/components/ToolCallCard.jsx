import { useState } from "react";

export default function ToolCallCard({ call }) {
  const [open, setOpen] = useState(false);
  const failed = call.result && call.result.error;

  return (
    <div className={`tool-card ${failed ? "tool-card-error" : ""}`}>
      <button className="tool-card-head" onClick={() => setOpen((o) => !o)}>
        <span className="tool-card-caret">{open ? "▾" : "▸"}</span>
        <span className="tool-card-name">{call.name}</span>
        <span className="tool-card-status">{failed ? "failed" : "ok"}</span>
      </button>
      {open && (
        <div className="tool-card-body">
          <div className="tool-card-section">
            <span className="tool-card-label">args</span>
            <pre>{JSON.stringify(call.args, null, 2)}</pre>
          </div>
          <div className="tool-card-section">
            <span className="tool-card-label">result</span>
            <pre>{JSON.stringify(call.result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
