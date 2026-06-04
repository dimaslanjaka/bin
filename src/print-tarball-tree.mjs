import fs from 'node:fs';
import * as zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import tar from 'tar-stream';

export function addToTree(tree, parts) {
  let node = tree;

  for (const part of parts) {
    if (!node[part]) node[part] = {};
    node = node[part];
  }

  return tree;
}

export function formatTree(node, prefix = '') {
  const lines = [];
  const entries = Object.keys(node).sort();

  entries.forEach(function (key, index) {
    const isLast = index === entries.length - 1;
    const child = node[key];
    const line = prefix + (isLast ? '└── ' : '├── ') + key;
    const newPrefix = prefix + (isLast ? '    ' : '│   ');

    lines.push(line);
    lines.push(...formatTree(child, newPrefix));
  });

  return lines;
}

export function printTree(node, prefix = '', logger = console.log) {
  for (const line of formatTree(node, prefix)) {
    logger(line);
  }
}

export async function printTgzTree(filePath, options = {}) {
  const logger = options.logger || console.log;
  const extract = tar.extract();
  const tree = {};

  extract.on('entry', function (header, stream, next) {
    const parts = header.name.split('/').filter(Boolean);

    if (parts.length) addToTree(tree, parts);

    stream.once('end', next);
    stream.once('error', next);
    stream.resume();
  });

  await pipeline(fs.createReadStream(filePath), zlib.createGunzip(), extract);

  printTree(tree, '', logger);

  return tree;
}
