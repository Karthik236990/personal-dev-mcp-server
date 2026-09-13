// index.js
// Single source of truth for every tool: its name, description, JSON-schema
// parameters, and its implementation function. Both the MCP stdio server
// and the Gemini-powered backend import THIS file, so behavior never
// drifts between the two.

import { readFile, writeFile, deleteFile, listDirectory, searchCode } from "./filesystem.js";
import { runShellCommand, ALLOWED_COMMANDS } from "./shell.js";
import { gitStatus, gitDiff, gitLog, gitCommit } from "./git.js";
import { addTodo, listTodos, completeTodo } from "./notes.js";
import { getSystemInfo } from "./system.js";

export const tools = [
  {
    name: "read_file",
    description: "Read the full text content of a file inside the workspace.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relative to the workspace root, e.g. 'src/index.js'." },
      },
      required: ["path"],
    },
    handler: readFile,
  },
  {
    name: "write_file",
    description: "Create a file or overwrite it with new content. Creates parent folders as needed.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relative to the workspace root." },
        content: { type: "string", description: "The full text content to write." },
      },
      required: ["path", "content"],
    },
    handler: writeFile,
  },
  {
    name: "delete_file",
    description: "Delete a file or folder inside the workspace.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relative to the workspace root." },
      },
      required: ["path"],
    },
    handler: deleteFile,
  },
  {
    name: "list_directory",
    description: "List files and folders at a given path in the workspace.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relative to the workspace root. Defaults to '.' (the root)." },
      },
      required: [],
    },
    handler: listDirectory,
  },
  {
    name: "search_code",
    description: "Recursively search text files under a folder for a plain-text query (grep-like). Skips node_modules and .git.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to search for (case-insensitive)." },
        path: { type: "string", description: "Folder to search under, relative to workspace root. Defaults to '.'." },
        maxResults: { type: "number", description: "Maximum number of matches to return. Defaults to 50." },
      },
      required: ["query"],
    },
    handler: searchCode,
  },
  {
    name: "run_shell_command",
    description: `Run a shell command inside the sandboxed workspace. Only these commands are allowed: ${ALLOWED_COMMANDS.join(", ")}. No chaining (;, &, |, backticks, redirects).`,
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The full command line to run, e.g. 'ls -la' or 'npm install'." },
      },
      required: ["command"],
    },
    handler: runShellCommand,
  },
  {
    name: "git_status",
    description: "Show the short git status of the workspace repo (initializes a repo if none exists).",
    parameters: { type: "object", properties: {}, required: [] },
    handler: gitStatus,
  },
  {
    name: "git_diff",
    description: "Show the current git diff of the workspace repo.",
    parameters: {
      type: "object",
      properties: {
        staged: { type: "boolean", description: "If true, show staged diff instead of the working-tree diff." },
      },
      required: [],
    },
    handler: gitDiff,
  },
  {
    name: "git_log",
    description: "Show recent commit history of the workspace repo.",
    parameters: {
      type: "object",
      properties: {
        maxCount: { type: "number", description: "Number of commits to show. Defaults to 10." },
      },
      required: [],
    },
    handler: gitLog,
  },
  {
    name: "git_commit",
    description: "Stage all changes and commit them with a message.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "The commit message." },
      },
      required: ["message"],
    },
    handler: gitCommit,
  },
  {
    name: "add_todo",
    description: "Add a personal todo item.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The todo item's text." },
      },
      required: ["text"],
    },
    handler: addTodo,
  },
  {
    name: "list_todos",
    description: "List all personal todo items and their status.",
    parameters: { type: "object", properties: {}, required: [] },
    handler: listTodos,
  },
  {
    name: "complete_todo",
    description: "Mark a todo item as done by its id.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "number", description: "The todo's numeric id, from list_todos." },
      },
      required: ["id"],
    },
    handler: completeTodo,
  },
  {
    name: "get_system_info",
    description: "Get basic system info: OS, architecture, Node version, CPU count, memory.",
    parameters: { type: "object", properties: {}, required: [] },
    handler: getSystemInfo,
  },
];

export function getToolByName(name) {
  return tools.find((t) => t.name === name);
}

export async function callTool(name, args) {
  const tool = getToolByName(name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.handler(args || {});
}
