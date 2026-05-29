import fs from 'fs';
import zlib from 'zlib';
import tar from 'tar-stream';
import path from 'path';
import { getArgs } from './utils/index.cjs';

function addToTree(tree, parts) {
  let node = tree;

  for (const part of parts) {
    if (!node[part]) node[part] = {};
    node = node[part];
  }
}

function printTree(node, prefix = '') {
  const entries = Object.keys(node).sort();

  entries.forEach((key, index) => {
    const isLast = index === entries.length - 1;
    console.log(prefix + (isLast ? '└── ' : '├── ') + key);

    const child = node[key];
    const newPrefix = prefix + (isLast ? '    ' : '│   ');
    printTree(child, newPrefix);
  });
}

function printTgzTree(filePath) {
  const extract = tar.extract();
  const tree = {};

  extract.on('entry', (header, stream, next) => {
    const parts = header.name.split('/').filter(Boolean);

    if (parts.length) addToTree(tree, parts);

    stream.on('end', next);
    stream.resume();
  });

  extract.on('finish', () => {
    printTree(tree);
  });

  fs.createReadStream(filePath).pipe(zlib.createGunzip()).pipe(extract);
}

const argv = getArgs({ string: ['file'], alias: { f: 'file', h: 'help' } });

if (argv.help) {
  console.log(`
Usage: node src/print-tarball-tree.mjs [options]

Options:
  -f, --file <path>    Path to the tarball file (default: package.tgz)
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

printTgzTree(filePath);
