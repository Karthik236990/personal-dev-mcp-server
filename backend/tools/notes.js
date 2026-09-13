// notes.js
// A tiny personal todo tracker, persisted as JSON inside the sandboxed
// workspace so it round-trips with everything else the assistant touches.

import fs from "fs/promises";
import path from "path";
import { WORKSPACE_ROOT } from "./filesystem.js";

const TODO_FILE = path.join(WORKSPACE_ROOT, ".todos.json");

async function loadTodos() {
  try {
    const raw = await fs.readFile(TODO_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveTodos(todos) {
  await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
  await fs.writeFile(TODO_FILE, JSON.stringify(todos, null, 2), "utf-8");
}

export async function addTodo({ text }) {
  if (!text) throw new Error("Todo text is required.");
  const todos = await loadTodos();
  const todo = {
    id: todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1,
    text,
    done: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  await saveTodos(todos);
  return { todo };
}

export async function listTodos() {
  const todos = await loadTodos();
  return { todos };
}

export async function completeTodo({ id }) {
  const todos = await loadTodos();
  const todo = todos.find((t) => t.id === Number(id));
  if (!todo) throw new Error(`No todo with id ${id}.`);
  todo.done = true;
  todo.completedAt = new Date().toISOString();
  await saveTodos(todos);
  return { todo };
}
