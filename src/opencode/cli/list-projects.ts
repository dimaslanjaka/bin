import { loadProjects } from '../database.js';

export async function handleListProjects(): Promise<void> {
  const projects = await loadProjects();
  console.log(`Projects (${projects.length}):\n`);
  const rows = projects.map((p) => ({
    id: p.id.slice(0, 8),
    name: p.name || '-',
    worktree: p.worktree
  }));
  const idWidth = Math.max(...rows.map((r) => r.id.length), 2);
  const nameWidth = Math.max(...rows.map((r) => r.name.length), 4);
  const sep = '─'.repeat(idWidth + nameWidth + 15);
  console.log(`  ${'ID'.padEnd(idWidth)}  ${'Name'.padEnd(nameWidth)}  Worktree`);
  console.log(`  ${sep}`);
  for (const r of rows) {
    console.log(`  ${r.id.padEnd(idWidth)}  ${r.name.padEnd(nameWidth)}  ${r.worktree}`);
  }
}
