// shell.js
// Runs a small, explicit whitelist of shell commands inside the sandboxed
// workspace folder. This is the guardrail that stops an LLM (which can be
// tricked by things it reads) from running arbitrary destructive commands
// on your real machine.

import { exec } from "child_process";
import { promisify } from "util";
import { WORKSPACE_ROOT } from "./filesystem.js";

const execAsync = promisify(exec);

// Only the base command (first word) needs to appear here.
export const ALLOWED_COMMANDS = [
  "ls",
  "cat",
  "pwd",
  "echo",
  "mkdir",
  "grep",
  "find",
  "node",
  "npm",
  "npx",
  "python3",
  "git",
  "wc",
  "head",
  "tail",
  "date",
];

export async function runShellCommand({ command }) {
  const trimmed = (command || "").trim();
  if (!trimmed) {
    throw new Error("No command provided.");
  }

  const base = trimmed.split(/\s+/)[0];
  if (!ALLOWED_COMMANDS.includes(base)) {
    throw new Error(
      `Command "${base}" is not in the allowed list (${ALLOWED_COMMANDS.join(
        ", "
      )}). Edit ALLOWED_COMMANDS in tools/shell.js to permit it.`
    );
  }

  // Basic guard against obvious shell-escape / chaining tricks.
  if (/[;&|`$><]/.test(trimmed.replace(/^[^\s]+/, ""))) {
    throw new Error(
      "Command chaining/redirection characters are blocked for safety (;, &, |, `, $, <, >)."
    );
  }

  try {
    const { stdout, stderr } = await execAsync(trimmed, {
      cwd: WORKSPACE_ROOT,
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    });
    return { command: trimmed, stdout: stdout?.trim(), stderr: stderr?.trim() };
  } catch (err) {
    return {
      command: trimmed,
      error: err.message,
      stdout: err.stdout?.trim(),
      stderr: err.stderr?.trim(),
    };
  }
}
