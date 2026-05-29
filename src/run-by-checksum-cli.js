#!/usr/bin/env node

import { getArgs } from './utils/index.cjs';
import { runChecksum } from './run-by-checksum/run.js';

const argv = getArgs({
  string: ['pattern', 'ignore', 'exec', 'cwd'],
  alias: { p: 'pattern', i: 'ignore', e: 'exec', c: 'cwd', h: 'help' },
  default: {
    pattern: [],
    ignore: []
  }
});

if (argv.help) {
  console.log(`
Usage: run-by-checksum [options]

Run a command when the checksum of matched files changes.

Options:
  -p, --pattern <glob>   Glob pattern(s) to include (can be repeated)
  -i, --ignore <glob>    Glob pattern(s) to exclude (can be repeated)
  -e, --exec <command>   Command to execute when checksum changes
  -c, --cwd <dir>        Working directory for glob and spawn (default: process.env.INIT_CWD or cwd)
  -h, --help             Show this help message
`);
  process.exit(0);
}

const patterns = Array.isArray(argv.pattern) ? argv.pattern : [argv.pattern];
const ignore = Array.isArray(argv.ignore) ? argv.ignore : [argv.ignore];

console.log('[run-by-checksum] patterns:', patterns.join(', '));
console.log('[run-by-checksum] ignore:', ignore.join(', ') || '(none)');
console.log('[run-by-checksum] cwd:', argv.cwd || process.env.INIT_CWD || process.cwd());
console.log('[run-by-checksum] exec:', argv.exec || '(none)');

runChecksum({
  patterns,
  ignore,
  exec: argv.exec,
  cwd: argv.cwd
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
