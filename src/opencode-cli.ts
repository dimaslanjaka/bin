#!/usr/bin/env node

import { getArgs } from './utils/index.cjs';
import { checkDatabase, deleteSessionById, deleteAllSessions, deleteAllProjectSessions } from './opencode/database.js';
import { handleAuthRotate } from './opencode/cli/auth-rotate.js';
import { handleListProjects } from './opencode/cli/list-projects.js';
import { handleListSessions } from './opencode/cli/list-sessions.js';
import { loadDotenv } from './binary-collections/config.cjs';

loadDotenv();

const argv = getArgs({
  alias: { h: 'help', p: 'proxy' }
});

function printHelp(): void {
  console.log(`
Usage: opc <command> [options]

Commands:
  list session            List all sessions grouped by directory
  list project            List all projects
  delete session <id>     Delete a single session by ID
  delete sessions         Delete all sessions (irreversible)
  delete project <id>     Delete a project's sessions from the OpenCode database (not the real project folder)
  auth rotate             Rotate OpenCode API key from .opencode.keys.json(c)

Options:
  -h, --help          Show this help message
  -p, --proxy <url>   Proxy URL for API requests (format: protocol://ip:port or protocol://user:pass@ip:port)
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
      await handleListSessions();
    } else if (sub === 'project') {
      await handleListProjects();
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
      console.log(`Deleting project ${projectId} sessions from the OpenCode database...`);
      await deleteAllProjectSessions(projectId);
      console.log('Done.');
    } else {
      console.error(`Unknown subcommand: delete ${sub || ''}`);
      printHelp();
      process.exit(1);
    }
  } else if (command === 'auth') {
    const sub = argv._[1];
    if (sub === 'rotate') {
      await handleAuthRotate({ proxy: argv.proxy });
    } else {
      console.error(`Unknown subcommand: auth ${sub || ''}`);
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
