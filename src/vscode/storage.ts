import * as path from 'upath';
import * as os from 'os';
import * as process from 'process';
import fs from 'fs-extra';

/**
 * Resolve the VS Code app data directory for the current platform.
 *
 * - Windows: `%APPDATA%\Code`
 * - macOS:   `~/Library/Application Support/Code`
 * - Linux:   `~/.config/Code`
 */
function getAppDataDir(): string {
  if (process.env.VSCODE_APP_DATA) return process.env.VSCODE_APP_DATA;
  const platform = os.platform();
  if (platform === 'win32') return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData/Roaming'), 'Code');
  if (platform === 'darwin') return path.join(os.homedir(), 'Library/Application Support/Code');
  return path.join(os.homedir(), '.config/Code');
}

/**
 * Resolve the VS Code cache directory for the current platform.
 *
 * - Windows: `%APPDATA%\Code\Cache`
 * - macOS:   `~/Library/Caches/Code`
 * - Linux:   `~/.cache/Code`
 */
function getCacheDir(): string {
  const platform = os.platform();
  if (platform === 'win32')
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData/Roaming'), 'Code/Cache');
  if (platform === 'darwin') return path.join(os.homedir(), 'Library/Caches/Code');
  return path.join(os.homedir(), '.cache/Code');
}

/** VS Code app data root directory (platform-specific). */
export const APP_DATA_DIR = getAppDataDir();

/** User configuration directory (`<APP_DATA_DIR>/User`). */
export const USER_DIR = path.join(APP_DATA_DIR, 'User');

/** User settings file (`<USER_DIR>/settings.json`). */
export const SETTINGS_PATH = path.join(USER_DIR, 'settings.json');

/** User keybindings file (`<USER_DIR>/keybindings.json`). */
export const KEYBINDINGS_PATH = path.join(USER_DIR, 'keybindings.json');

/** User snippets directory (`<USER_DIR>/snippets`). */
export const SNIPPETS_DIR = path.join(USER_DIR, 'snippets');

/** Workspace storage directory (`<USER_DIR>/workspaceStorage`). */
export const WORKSPACE_STORAGE_DIR = path.join(USER_DIR, 'workspaceStorage');

/** Global storage directory (`<USER_DIR>/globalStorage`). */
export const GLOBAL_STORAGE_DIR = path.join(USER_DIR, 'globalStorage');

/** History directory (`<USER_DIR>/History`). */
export const HISTORY_DIR = path.join(USER_DIR, 'History');

/** Sync data directory (`<USER_DIR>/sync`). */
export const SYNC_DIR = path.join(USER_DIR, 'sync');

/** Global extensions directory (`~/.vscode/extensions`). */
export const EXTENSIONS_DIR = path.join(os.homedir(), '.vscode/extensions');

/** VS Code cache root directory (platform-specific). */
export const CACHE_DIR = getCacheDir();

/** Cached data directory (`<CACHE_DIR>/CachedData`). */
export const CACHED_DATA_DIR = path.join(CACHE_DIR, 'CachedData');

/** Cached extensions directory (`<CACHE_DIR>/CachedExtensions`). */
export const CACHED_EXTENSIONS_DIR = path.join(CACHE_DIR, 'CachedExtensions');

/** Cached VSIX directory (`<CACHE_DIR>/CachedExtensionVSIXs`). */
export const CACHED_VSIXS_DIR = path.join(CACHE_DIR, 'CachedExtensionVSIXs');

/** Logs directory (`<APP_DATA_DIR>/logs`). */
export const LOGS_DIR = path.join(APP_DATA_DIR, 'logs');

/** Main VS Code state database (`<APP_DATA_DIR>/state.vscdb`). */
export const DATABASE_PATH = path.join(APP_DATA_DIR, 'state.vscdb');

/** Machine identifier file (`<APP_DATA_DIR>/machineid`). */
export const MACHINE_ID_PATH = path.join(APP_DATA_DIR, 'machineid');

/**
 * Convert a `file:///` URI to an absolute filesystem path.
 *
 * Examples:
 *   `file:///d%3A/Repositories/hexo-is` → `d:/Repositories/hexo-is` (Windows)
 *   `file:///Users/name/project`          → `/Users/name/project` (macOS/Linux)
 */
function fileUriToPath(uri: string): string {
  if (!uri.startsWith('file:///')) return uri;
  return decodeURIComponent(uri.slice(8));
}

export interface WorkspaceEntry {
  /** Absolute filesystem path to the workspace folder (decoded from the `file://` URI). */
  folder: string;
  /** The storage folder name (hash). */
  storageId: string;
  /** Full path to the storage directory (e.g. `.../workspaceStorage/<storageId>`). */
  storagePath: string;
  /** Full path to the Copilot memory tool directory, if it exists. */
  copilotMemoryDir?: string;
}

/**
 * Scan all subdirectories under `WORKSPACE_STORAGE_DIR` and read each
 * `workspace.json` to collect workspace folder URIs.
 *
 * Subdirectories without a valid `workspace.json` are silently skipped.
 */
export async function listWorkspaceProjects(): Promise<WorkspaceEntry[]> {
  const entries: WorkspaceEntry[] = [];

  let dirEntries: string[];
  try {
    dirEntries = await fs.readdir(WORKSPACE_STORAGE_DIR);
  } catch {
    return entries;
  }

  for (const storageId of dirEntries) {
    const wsPath = path.join(WORKSPACE_STORAGE_DIR, storageId, 'workspace.json');
    try {
      const content = await fs.readFile(wsPath, 'utf8');
      const data = JSON.parse(content) as Record<string, unknown>;
      if (typeof data.folder === 'string' && data.folder.length > 0) {
        const storagePath = path.join(WORKSPACE_STORAGE_DIR, storageId);
        const entry: WorkspaceEntry = { folder: fileUriToPath(data.folder), storageId, storagePath };

        const copilotMemoryDir = path.join(storagePath, 'GitHub.copilot-chat', 'memory-tool', 'memories');
        if (await fs.pathExists(copilotMemoryDir)) {
          entry.copilotMemoryDir = copilotMemoryDir;
        }

        entries.push(entry);
      }
    } catch {
      // skip folders without a valid workspace.json
    }
  }

  return entries;
}
