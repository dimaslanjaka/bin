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

// -------------------------
// helper: safe exit code
// -------------------------
function getExitCode() {
  const code = argv['exit-code'];

  if (code === undefined) return 1;

  const num = Number(code);

  return Number.isNaN(num) ? 1 : num;
}

// -------------------------
// help
// -------------------------
if (argv.help) {
  console.log(`
Usage:
  node run.js [options] <file>

Options:
  -h, --help            Show help
  --exit-code=<code>    Exit code when file not found or invalid (default: 1)

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

// -------------------------
// validate input
// -------------------------
const filename = argv._[0];

if (!filename) {
  console.error('No file specified. Use --help for usage.');
  process.exit(getExitCode());
}

const filepath = path.resolve(filename);

// -------------------------
// file existence check
// -------------------------
if (!fs.existsSync(filepath)) {
  console.error(`File not found: ${filepath}`);
  process.exit(getExitCode());
}

// -------------------------
// executor map
// -------------------------
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

// -------------------------
// spawn config
// -------------------------
let command = executor;
let args = [filepath];

if (ext === '.bat') {
  args = ['/c', filepath];
}

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

// -------------------------
// exit handling
// -------------------------
child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
