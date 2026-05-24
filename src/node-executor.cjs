#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('upath');
const minimist = require('minimist');
const { spawn } = require('child_process');

const argv = minimist(process.argv.slice(2), {
  boolean: ['help', 'h'],
  string: ['exit-code'],
  alias: {
    h: 'help'
  },
  default: {
    'exit-code': '1'
  }
});

if (argv.help) {
  console.log(`
Usage:
  node run.js [options] <file>

Options:
  -h, --help            Show help
  --exit-code=<code>   Exit code when file not found or invalid (default: 1)

Examples:
  node run.js test.php
  node run.js script.js
  node run.js --exit-code=0 missing.php

Supported extensions:
  .php -> php
  .js  -> node
  .mjs -> node
  .cjs -> node
  .py  -> python
  .rb  -> ruby
  .sh  -> bash
  .bat -> cmd
  `);

  process.exit(0);
}

const filename = argv._[0];

if (!filename) {
  console.error('No file specified. Use --help for usage.');
  process.exit(Number(argv['exit-code']) || 1);
}

const filepath = path.resolve(filename);

if (!fs.existsSync(filepath)) {
  console.error(`File not found: ${filepath}`);
  process.exit(Number(argv['exit-code']) || 1);
}

const ext = path.extname(filepath).toLowerCase();

const executors = {
  '.php': 'php',
  '.js': 'node',
  '.mjs': 'node',
  '.cjs': 'node',
  '.py': 'python',
  '.rb': 'ruby',
  '.sh': 'bash',
  '.bat': 'cmd'
};

const executor = executors[ext];

if (!executor) {
  console.error(`No executor registered for extension: ${ext}`);
  process.exit(1);
}

let command = executor;
let args = [filepath];

if (ext === '.bat') {
  args = ['/c', filepath];
}

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
