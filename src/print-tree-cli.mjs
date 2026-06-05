#!/usr/bin/env node

import { getArgs } from './utils/index.cjs';
import { printTree } from './print-tree.mjs';

const argv = getArgs();

if (argv.help || argv.h) {
  console.log(`
Usage: print-tree [options] [path]

Print directory tree or tarball (.tgz) tree.

Arguments:
  path                          Path to file or directory (default: current directory)

Options:
  --help, -h                    Show this help message
`);
  process.exit(0);
}

const inputPath = argv._[0] || '.';
printTree(inputPath).catch((err) => {
  console.error(err);
  process.exit(1);
});
