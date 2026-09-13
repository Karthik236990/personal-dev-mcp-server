// filesystem.js
// Sandboxed file tools. Every path the model gives us is resolved against
// WORKSPACE_ROOT and checked to make sure it can never escape that folder
// (blocks "../../etc/passwd" style traversal).

import fs from "fs/promises";
import path from "path";

export const WORKSPACE_ROOT = path.resolve(
  process.env.WORKSPACE_ROOT || path.join(process.cwd(), "workspace")
);

async function ensureWorkspace() {
  await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
}

/**
 * Resolve a user/model-supplied relative path safely inside the workspace.
 * Throws if the resolved path escapes WORKSPACE_ROOT.
 */
export function safeResolve(relativePath = ".") {
  const resolved = path.resolve(WORKSPACE_ROOT, relativePath);
  if (resolved !== WORKSPACE_ROOT && !resolved.startsWith(WORKSPACE_ROOT + path.sep)) {
    throw new Error(
      `Path "${relativePath}" escapes the sandboxed workspace. Refusing.`
    );
  }
  return resolved;
}

export async function readFile({ path: relPath }) {
  await ensureWorkspace();
  const target = safeResolve(relPath);
  const content = await fs.readFile(target, "utf-8");
  return { path: relPath, content };
}

export async function writeFile({ path: relPath, content = "" }) {
  await ensureWorkspace();
  const target = safeResolve(relPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf-8");
  return { path: relPath, bytesWritten: Buffer.byteLength(content, "utf-8") };
}

export async function deleteFile({ path: relPath }) {
  await ensureWorkspace();
  const target = safeResolve(relPath);
  const stat = await fs.stat(target);
  if (stat.isDirectory()) {
    await fs.rm(target, { recursive: true, force: true });
  } else {
    await fs.unlink(target);
  }
  return { path: relPath, deleted: true };
}

export async function listDirectory({ path: relPath = "." }) {
  await ensureWorkspace();
  const target = safeResolve(relPath);
  const entries = await fs.readdir(target, { withFileTypes: true });
  return {
    path: relPath,
    entries: entries.map((e) => ({
      name: e.name,
      type: e.isDirectory() ? "directory" : "file",
    })),
  };
}

/**
 * Recursively search files under a folder for a string (case-insensitive
 * plain-text match). Simple, dependency-free grep replacement.
 */
export async function searchCode({ query, path: relPath = ".", maxResults = 50 }) {
  await ensureWorkspace();
  const root = safeResolve(relPath);
  const results = [];

  async function walk(dir) {
    if (results.length >= maxResults) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxResults) return;
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        let content;
        try {
          content = await fs.readFile(full, "utf-8");
        } catch {
          continue; // binary or unreadable file, skip
        }
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          if (results.length >= maxResults) return;
          if (line.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              file: path.relative(WORKSPACE_ROOT, full),
              line: i + 1,
              text: line.trim().slice(0, 200),
            });
          }
        });
      }
    }
  }

  await walk(root);
  return { query, matches: results, count: results.length };
}
