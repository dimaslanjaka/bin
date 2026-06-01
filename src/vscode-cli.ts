#!/usr/bin/env node

import minimist from 'minimist';
import { listWorkspaceProjects } from './vscode/storage.js';

const argv = minimist(process.argv.slice(2), {
  alias: { h: 'help', 'copilot-memory': ['copilotMemory', 'cm'] }
});

function printHelp(): void {
  console.log(`
Usage: vscode-cli <command> [options]

Commands:
  list project            List all workspace projects
  list project --copilot-memory
                          List only projects with Copilot memory tool directories

Options:
  -h, --help              Show this help message
  --copilot-memory        Filter to projects with Copilot memory tool
`);
}

async function main(): Promise<void> {
  if (argv.help || argv._.length === 0) {
    printHelp();
    return;
  }

  const command = argv._[0];

  if (command === 'list') {
    const sub = argv._[1];
    if (sub === 'project') {
      const all = await listWorkspaceProjects();

      let projects = all;
      if (argv['copilot-memory']) {
        projects = all.filter((p) => p.copilotMemoryDir);
      }

      console.log(`Projects (${projects.length}):\n`);
      if (!projects.length) return;

      const rows = projects.map((p) => ({
        id: p.storageId.slice(0, 8),
        folder: p.folder,
        hasMemory: p.copilotMemoryDir ? 'yes' : ''
      }));
      const idWidth = Math.max(2, ...rows.map((r) => r.id.length));
      const folderWidth = Math.max(6, ...rows.map((r) => r.folder.length));
      const sep = '─'.repeat(idWidth + folderWidth + 12);
      console.log(`  ${'ID'.padEnd(idWidth)}  ${'Folder'.padEnd(folderWidth)}  Memory`);
      console.log(`  ${sep}`);
      for (const r of rows) {
        console.log(`  ${r.id.padEnd(idWidth)}  ${r.folder.padEnd(folderWidth)}  ${r.hasMemory}`);
      }
    } else {
      console.error(`Unknown subcommand: list ${sub || ''}`);
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
