// git.js
// Thin, safe wrappers around a handful of read-mostly git commands, plus
// commit. All run with cwd pinned to the sandboxed workspace.

import { exec } from "child_process";
import { promisify } from "util";
import { WORKSPACE_ROOT } from "./filesystem.js";

const execAsync = promisify(exec);

async function run(cmd) {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: WORKSPACE_ROOT,
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, stdout: stdout?.trim(), stderr: stderr?.trim() };
  } catch (err) {
    return { ok: false, error: err.message, stdout: err.stdout?.trim(), stderr: err.stderr?.trim() };
  }
}

async function ensureRepo() {
  const check = await run("git rev-parse --is-inside-work-tree");
  if (!check.ok) {
    await run("git init");
  }
}

export async function gitStatus() {
  await ensureRepo();
  return run("git status --short --branch");
}

export async function gitDiff({ staged = false } = {}) {
  await ensureRepo();
  return run(staged ? "git diff --staged" : "git diff");
}

export async function gitLog({ maxCount = 10 } = {}) {
  await ensureRepo();
  return run(`git log -${Number(maxCount) || 10} --oneline --decorate`);
}

export async function gitCommit({ message }) {
  if (!message) throw new Error("A commit message is required.");
  await ensureRepo();
  await run("git add -A");
  return run(`git commit -m ${JSON.stringify(message)}`);
}
