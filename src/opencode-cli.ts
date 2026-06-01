#!/usr/bin/env node

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
  list session            List all sessions
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
      console.log(`Sessions (${sessions.length}):\n`);
      const rows = sessions.map((s) => ({
        slug: s.slug,
        title: s.title || '-',
        version: s.version
      }));
      const slugWidth = Math.max(...rows.map((r) => r.slug.length), 4);
      const titleWidth = Math.max(...rows.map((r) => r.title.length), 5);
      const sep = '─'.repeat(slugWidth + titleWidth + 13);
      console.log(`  ${'Slug'.padEnd(slugWidth)}  ${'Title'.padEnd(titleWidth)}  Version`);
      console.log(`  ${sep}`);
      for (const r of rows) {
        console.log(`  ${r.slug.padEnd(slugWidth)}  ${r.title.padEnd(titleWidth)}  ${r.version}`);
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
