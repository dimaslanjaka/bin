import { DATABASE_PATH } from './storage.js';
import { SQLite } from '../utils/sqlite/index.js';
import fs from 'fs-extra';
import { execSync } from 'node:child_process';

export async function checkDatabase(): Promise<boolean> {
  if (!fs.existsSync(DATABASE_PATH)) {
    console.error('No OpenCode database found. Run opencode (v1.2.0+) at least once to create the database.');
    return false;
  }

  try {
    const db = new SQLite(DATABASE_PATH);
    try {
      const rows = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='session'");
      // console.log('Database tables:', rows.map((r) => r.name).join(', '));

      if (rows.length === 0) {
        console.error(
          'OpenCode database exists but is missing expected tables. Try running opencode to complete the migration.'
        );
        return false;
      }

      return true;
    } finally {
      db.close();
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Could not open OpenCode database: ${error.message}`);
    } else {
      console.error('Could not open OpenCode database.');
    }
    return false;
  }
}

interface ProjectRow {
  id: string;
  worktree: string;
  vcs: string | null;
  name: string | null;
  time_created: number;
  time_updated: number;
  sandboxes: string;
}

interface SessionRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  slug: string;
  directory: string;
  title: string;
  version: string;
  share_url: string | null;
  summary_additions: number | null;
  summary_deletions: number | null;
  summary_files: number | null;
  time_created: number;
  time_updated: number;
  time_compacting: number | null;
  time_archived: number | null;
}

interface MessageRow {
  id: string;
  session_id: string;
  data: string;
}

interface PartRow {
  id: string;
  message_id: string;
  session_id: string;
  data: string;
}

interface TranscriptRow {
  message_id: string;
  message_data: string;
  part_id: string | null;
  part_message_id: string | null;
  part_session_id: string | null;
  part_data: string | null;
}

export interface Project {
  id: string;
  worktree: string;
  vcs: string | null;
  name: string | null;
  sandboxes: unknown[];
  time: {
    created: number;
    updated: number;
  };
}

function toProject(row: ProjectRow): Project {
  let sandboxes: unknown[] = [];

  try {
    sandboxes = JSON.parse(row.sandboxes);
  } catch {
    // ignore malformed JSON
  }

  return {
    id: row.id,
    worktree: row.worktree,
    vcs: row.vcs,
    name: row.name,
    sandboxes,
    time: {
      created: row.time_created,
      updated: row.time_updated
    }
  };
}

export interface Session {
  id: string;
  slug: string;
  version: string;
  projectID: string;
  directory: string;
  parentID?: string;
  title: string;
  time: {
    created: number;
    updated: number;
    compacting?: number;
    archived?: number;
  };
  summary?: {
    additions: number;
    deletions: number;
    files: number;
  };
  share?: {
    url: string;
  };
}

function toSession(row: SessionRow): Session {
  const session: Session = {
    id: row.id,
    slug: row.slug,
    version: row.version,
    projectID: row.project_id,
    directory: row.directory,
    parentID: row.parent_id ?? undefined,
    title: row.title,
    time: {
      created: row.time_created,
      updated: row.time_updated,
      compacting: row.time_compacting ?? undefined,
      archived: row.time_archived ?? undefined
    }
  };

  if (row.summary_files != null) {
    session.summary = {
      additions: row.summary_additions ?? 0,
      deletions: row.summary_deletions ?? 0,
      files: row.summary_files
    };
  }

  if (row.share_url) {
    session.share = { url: row.share_url };
  }

  return session;
}

export interface Message {
  id: string;
  sessionID: string;
  role: 'user' | 'assistant';
  time: {
    created: number;
    completed?: number;
  };
  parentID?: string;
  modelID?: string;
  providerID?: string;
  agent?: string;
  mode?: string;
  cost?: number;
  tokens?: {
    input: number;
    output: number;
    reasoning: number;
    cache: {
      read: number;
      write: number;
    };
  };
  finish?: string;
}

function toMessage(id: string, sessionID: string, dataJson: string): Message {
  const data = JSON.parse(dataJson) as Record<string, unknown>;

  return {
    id,
    sessionID,
    role: data.role as 'user' | 'assistant',
    time: data.time as { created: number; completed?: number },
    parentID: data.parentID as string | undefined,
    modelID: data.modelID as string | undefined,
    providerID: data.providerID as string | undefined,
    agent: data.agent as string | undefined,
    mode: data.mode as string | undefined,
    cost: data.cost as number | undefined,
    tokens: data.tokens as Message['tokens'] | undefined,
    finish: data.finish as string | undefined
  };
}

export interface ToolState {
  status?: string;
  input?: Record<string, unknown>;
  output?: string;
}

export interface Part {
  id: string;
  sessionID: string;
  messageID: string;
  type: string;
  text?: string;
  tool?: string;
  state?: ToolState;
}

function toPart(id: string, messageID: string, sessionID: string, dataJson: string): Part {
  const data = JSON.parse(dataJson) as Record<string, unknown>;

  return {
    id,
    messageID,
    sessionID,
    type: data.type as string,
    text: data.text as string | undefined,
    tool: data.tool as string | undefined,
    state: data.state as Part['state'] | undefined
  };
}

export async function loadProjects(): Promise<Project[]> {
  const rows = query<ProjectRow>('SELECT id, worktree, vcs, name, time_created, time_updated, sandboxes FROM project');

  return rows.map(toProject);
}

export async function loadSessions(): Promise<Session[]> {
  const rows = query<SessionRow>(
    `SELECT id, project_id, parent_id, slug, directory, title, version,
            share_url, summary_additions, summary_deletions, summary_files,
            time_created, time_updated, time_compacting, time_archived
     FROM session
     WHERE parent_id IS NULL
     ORDER BY time_updated DESC`
  );

  return rows.map(toSession);
}

export async function loadMessages(sessionID: string): Promise<Message[]> {
  const rows = query<MessageRow>(
    `SELECT id, session_id, data FROM message WHERE session_id = '${escapeSql(sessionID)}' ORDER BY id ASC`
  );

  return rows.map((row) => toMessage(row.id, row.session_id, row.data));
}

export async function loadParts(messageID: string): Promise<Part[]> {
  const rows = query<PartRow>(
    `SELECT id, message_id, session_id, data FROM part WHERE message_id = '${escapeSql(messageID)}' ORDER BY id ASC`
  );

  return rows.map((row) => toPart(row.id, row.message_id, row.session_id, row.data));
}

export interface TranscriptEntry {
  message: Message;
  parts: Part[];
}

export interface SessionWithProject {
  session: Session;
  project: Project | undefined;
}

export async function loadTranscript(sessionID: string): Promise<TranscriptEntry[]> {
  const sid = escapeSql(sessionID);
  const rows = query<TranscriptRow>(
    `SELECT m.id AS message_id, m.data AS message_data,
            p.id AS part_id, p.message_id AS part_message_id,
            p.session_id AS part_session_id, p.data AS part_data
     FROM message m
     LEFT JOIN part p ON p.message_id = m.id
     WHERE m.session_id = '${sid}'
     ORDER BY m.id ASC, p.id ASC`
  );

  // Group rows by message
  const entriesMap = new Map<string, TranscriptEntry>();

  for (const row of rows) {
    let entry = entriesMap.get(row.message_id);

    if (!entry) {
      entry = {
        message: toMessage(row.message_id, sessionID, row.message_data),
        parts: []
      };
      entriesMap.set(row.message_id, entry);
    }

    if (row.part_id && row.part_data && row.part_message_id && row.part_session_id) {
      const part = toPart(row.part_id, row.part_message_id, row.part_session_id, row.part_data);

      if ((part.type === 'text' && part.text) || part.type === 'tool') {
        entry.parts.push(part);
      }
    }
  }

  // Only include entries that have relevant parts
  return Array.from(entriesMap.values()).filter((entry) => entry.parts.length > 0);
}

function runSql(query: string): void {
  const dbPath = DATABASE_PATH;

  execSync(`sqlite3 "${dbPath}"`, {
    input: query,
    timeout: 10000
  });
}

export async function deleteSession(session: Session): Promise<void> {
  const sid = escapeSql(session.id);

  runSql(
    `WITH RECURSIVE descendants(id) AS (` +
      `SELECT id FROM session WHERE id = '${sid}' ` +
      `UNION ALL ` +
      `SELECT s.id FROM session s JOIN descendants d ON s.parent_id = d.id` +
      `) ` +
      `DELETE FROM session WHERE id IN (SELECT id FROM descendants);`
  );
}

export async function deleteSessionById(id: string): Promise<void> {
  const sid = escapeSql(id);

  runSql(
    `WITH RECURSIVE descendants(id) AS (` +
      `SELECT id FROM session WHERE id = '${sid}' ` +
      `UNION ALL ` +
      `SELECT s.id FROM session s JOIN descendants d ON s.parent_id = d.id` +
      `) ` +
      `DELETE FROM session WHERE id IN (SELECT id FROM descendants);`
  );
}

export async function deleteAllSessions(): Promise<void> {
  runSql(`DELETE FROM part; DELETE FROM message; DELETE FROM session;`);
}

export async function deleteAllProjectSessions(projectID: string): Promise<void> {
  const pid = escapeSql(projectID);

  runSql(`DELETE FROM session WHERE project_id = '${pid}'; DELETE FROM project WHERE id = '${pid}';`);
}

/** Run a read-only query using the SQLite class. */
function query<T>(sql: string): T[] {
  const db = new SQLite(DATABASE_PATH);
  try {
    return db.all<T>(sql);
  } finally {
    db.close();
  }
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}
