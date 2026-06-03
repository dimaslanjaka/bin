import moment from 'moment';
import { loadSessions } from '../database.js';

export async function handleListSessions(): Promise<void> {
  const sessions = await loadSessions();
  const grouped = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const dir = s.directory || '(no directory)';
    if (!grouped.has(dir)) grouped.set(dir, []);
    grouped.get(dir)!.push(s);
  }
  console.log(`Sessions (${sessions.length} total, ${grouped.size} directories):\n`);
  for (const [dir, dirSessions] of grouped) {
    console.log(`  ${dir}`);
    const slugWidth = Math.max(...dirSessions.map((s) => s.slug.length), 4);
    const titleWidth = Math.max(...dirSessions.map((s) => (s.title || '-').length), 5);
    const dateWidth = Math.max(
      ...dirSessions.map((s) => moment(s.time.created).format('YYYY-MM-DDTHH:mm:ssZ').length),
      25
    );
    const sep = '─'.repeat(Math.max(dir.length, slugWidth + titleWidth + dateWidth + 15));
    console.log(`  ${sep}`);
    console.log(`    ${'Slug'.padEnd(slugWidth)}  ${'Title'.padEnd(titleWidth)}  ${'Date'.padEnd(dateWidth)}  Version`);
    const rowSep = '─'.repeat(slugWidth + titleWidth + dateWidth + 17);
    console.log(`    ${rowSep}`);
    for (const s of dirSessions) {
      console.log(
        `    ${s.slug.padEnd(slugWidth)}  ${(s.title || '-').padEnd(titleWidth)}  ${moment(s.time.created).format('YYYY-MM-DDTHH:mm:ssZ').padEnd(dateWidth)}  ${s.version}`
      );
    }
    console.log();
  }
}
