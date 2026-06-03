import { checkDatabase, loadProjects, loadSessions } from './database.js';
import { SQLite } from './sqlite.js';
import { DATABASE_PATH, getSessionFileById } from './storage.js';

async function _checks(): Promise<void> {
  const ok = await checkDatabase();
  console.log(`Database check: ${ok ? 'OK' : 'FAILED'}`);
  const sessions = await loadSessions();
  console.log(`Loaded ${sessions.length} sessions.`);
  const projects = await loadProjects();
  console.log(`Loaded ${projects.length} projects.`);
}

async function _listSessions(): Promise<void> {
  const sessions = await loadSessions();
  console.log('Sessions:');
  for (const session of sessions) {
    console.log(
      `- ${session.id}: ${session.directory} (created: ${new Date(session.time.created).toISOString()}) ${session.title ? `- ${session.title}` : '<no title>'}`
    );
  }
}

async function _dumpSessionTable() {
  const db = new SQLite(DATABASE_PATH);
  try {
    const rows = db.all<any>(
      `SELECT *
       FROM session
       -- WHERE parent_id IS NULL
       ORDER BY time_updated DESC
       `
    );

    if (rows.length === 0) {
      console.error(`No session found.`);
      return;
    }

    for (const row of rows) {
      console.log(`Session id: ${row.id}, session dir: ${getSessionFileById(row.id)}`);
    }
  } finally {
    db.close();
  }
}

_dumpSessionTable().catch(console.error);
