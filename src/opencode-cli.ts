#!/usr/bin/env node

import moment from 'moment';
import minimist from 'minimist';
import {
  checkDatabase,
  loadProjects,
  loadSessions,
  deleteSessionById,
  deleteAllSessions,
  deleteAllProjectSessions
} from './opencode/database.js';

const argv = minimist(process.argv.slice(2), {
  alias: { h: 'help' }
});

function printHelp(): void {
  console.log(`
Usage: opc <command> [options]

Commands:
  list session            List all sessions grouped by directory
  list project            List all projects
  delete session <id>     Delete a single session by ID
  delete sessions         Delete all sessions (irreversible)
  delete project <id>     Delete a project and all its sessions

Options:
  -h, --help          Show this help message
`);
}

async function main(): Promise<void> {
  if (argv.help || argv._.length === 0) {
    printHelp();
    return;
  }

  const command = argv._[0];

  if (!(await checkDatabase())) {
    process.exit(1);
  }

  if (command === 'list') {
    const sub = argv._[1];
    if (sub === 'session') {
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
        console.log(
          `    ${'Slug'.padEnd(slugWidth)}  ${'Title'.padEnd(titleWidth)}  ${'Date'.padEnd(dateWidth)}  Version`
        );
        const rowSep = '─'.repeat(slugWidth + titleWidth + dateWidth + 17);
        console.log(`    ${rowSep}`);
        for (const s of dirSessions) {
          console.log(
            `    ${s.slug.padEnd(slugWidth)}  ${(s.title || '-').padEnd(titleWidth)}  ${moment(s.time.created).format('YYYY-MM-DDTHH:mm:ssZ').padEnd(dateWidth)}  ${s.version}`
          );
        }
        console.log();
      }
    } else if (sub === 'project') {
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
    } else {
      console.error(`Unknown subcommand: list ${sub || ''}`);
      printHelp();
      process.exit(1);
    }
  } else if (command === 'delete') {
    const sub = argv._[1];
    if (sub === 'session') {
      const sessionId = argv._[2];
      if (!sessionId) {
        console.error('Usage: opc delete session <id>');
        process.exit(1);
      }
      console.log(`Deleting session ${sessionId}...`);
      await deleteSessionById(sessionId);
      console.log('Done.');
    } else if (sub === 'sessions') {
      console.log('Deleting all sessions (irreversible)...');
      await deleteAllSessions();
      console.log('Done.');
    } else if (sub === 'project') {
      const projectId = argv._[2];
      if (!projectId) {
        console.error('Usage: opc delete project <id>');
        process.exit(1);
      }
      console.log(`Deleting project ${projectId} and all its sessions...`);
      await deleteAllProjectSessions(projectId);
      console.log('Done.');
    } else {
      console.error(`Unknown subcommand: delete ${sub || ''}`);
      printHelp();
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

main();
