import { checkDatabase, loadProjects, loadSessions } from './database.js';

async function main(): Promise<void> {
  const ok = await checkDatabase();
  console.log(`Database check: ${ok ? 'OK' : 'FAILED'}`);
  const sessions = await loadSessions();
  console.log(`Loaded ${sessions.length} sessions.`);
  const projects = await loadProjects();
  console.log(`Loaded ${projects.length} projects.`);
}

main();
