import path from 'upath';
import os from 'os';
import fs from 'fs-extra';

/** Root data directory (`~/.local/share/opencode`). */
export const OPCODE_DIR = path.join(os.homedir(), '.local/share/opencode');

/** Config directory (`~/.config/opencode`). */
export const CONFIG_DIR = path.join(os.homedir(), '.config/opencode');

/** Cache directory (`~/.cache/opencode`). */
export const CACHE_DIR = path.join(os.homedir(), '.cache/opencode');

/** Logs directory. */
export const LOG_DIR = path.join(OPCODE_DIR, 'log');

/** Path to the auth JSON file. */
export const AUTH_PATH = path.join(OPCODE_DIR, 'auth.json');

/** Project storage directory (sessions, messages). */
export const PROJECT_DIR = path.join(OPCODE_DIR, 'project');

/** @deprecated Legacy storage sub-path. Use `OPCODE_DIR` or `PROJECT_DIR` instead. */
export const STORAGE_PATH = path.join(OPCODE_DIR, 'storage');
/** @deprecated Legacy session sub-path. Use `PROJECT_DIR` instead. */
export const SESSION_PATH = path.join(STORAGE_PATH, 'session');

/** Session diff directory. */
export const SESSION_DIFF_DIR = path.join(STORAGE_PATH, 'session_diff');

/** Path to the OpenCode database. */
export const DATABASE_PATH = path.join(OPCODE_DIR, 'opencode.db');

export async function scanJson<T>(dir: string): Promise<T[]> {
  const results: T[] = [];
  try {
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const content = await fs.readFile(path.join(dir, entry), 'utf-8');
      results.push(JSON.parse(content));
    }
  } catch {
    // Ignore errors, return what we have
  }
  return results;
}

export async function scanDirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
