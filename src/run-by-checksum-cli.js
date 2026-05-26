#!/usr/bin/env node

import minimist from 'minimist';
import { runChecksum } from './run-by-checksum/run.js';

const argv = minimist(process.argv.slice(2), {
  string: ['pattern', 'ignore', 'exec'],
  alias: { p: 'pattern', i: 'ignore', e: 'exec', h: 'help' },
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
  -h, --help             Show this help message
`);
  process.exit(0);
}

const patterns = Array.isArray(argv.pattern) ? argv.pattern : [argv.pattern];

const ignore = Array.isArray(argv.ignore) ? argv.ignore : [argv.ignore];

runChecksum({
  patterns,
  ignore,
  exec: argv.exec
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
