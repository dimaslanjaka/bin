#!/usr/bin/env node

import fs from 'node:fs';
import path from 'upath';
import { fileURLToPath } from 'url';
import { getArgs } from './utils/index.cjs';
import { mainPrintTgzTree } from './print-tarball-tree.mjs';

const scriptName = path.toUnix(path.relative(process.cwd(), fileURLToPath(import.meta.url)));

export async function main() {
  const argv = getArgs({ string: ['file'], alias: { f: 'file', h: 'help' } });

  if (argv.help) {
    console.log(`
Usage: node ${scriptName} [options]

Options:
  -f, --file <path>    Path to the tarball file
  -h, --help           Show this help message
`);
    process.exit(0);
  }

  const filePath = argv.file ? (path.isAbsolute(argv.file) ? argv.file : path.resolve(process.cwd(), argv.file)) : null;

  if (!filePath) {
    console.error('Error: No file specified');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  try {
    await mainPrintTgzTree(filePath);
  } catch (error) {
    console.error(`Error: Failed to read tarball ${filePath}`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
