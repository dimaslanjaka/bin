import fs from 'node:fs';
import * as zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import tar from 'tar-stream';

/**
 * Adds path parts to a nested tree object.
 * Creates intermediate nodes as needed and returns the same (mutated) tree.
 * @param {Record<string, object>} tree - The tree object to mutate.
 * @param {string[]} parts - Path segments to insert (e.g. ['package', 'index.js']).
 * @returns {Record<string, object>} The mutated tree with the path parts inserted.
 */
export function addToTree(tree, parts) {
  let node = tree;

  for (const part of parts) {
    if (!node[part]) node[part] = {};
    node = node[part];
  }

  return tree;
}

/**
 * Recursively formats a tree node into an array of tree-drawing lines.
 * Uses Unicode box-drawing characters (└──, ├──, │, ────).
 * @param {Record<string, object>} node - The tree node to format.
 * @param {string} [prefix=''] - Prefix string for the current depth level.
 * @returns {string[]} Array of formatted lines representing the tree.
 */
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

/**
 * Prints a formatted tree to the given logger (defaults to console.log).
 * @param {Record<string, object>} node - The tree node to print.
 * @param {string} [prefix=''] - Prefix string for the current depth level.
 * @param {Console['log']} [logger=console.log] - Logging function to output lines.
 */
export function printTgzTree(node, prefix = '', logger = console.log) {
  for (const line of formatTree(node, prefix)) {
    logger(line);
  }
}

/**
 * Main entry point: reads a .tgz archive and prints its directory tree.
 * @param {string} filePath - Path to the .tgz file.
 * @param {{ logger?: Console['log'] }} [options] - Optional overrides (e.g. a custom logger).
 * @returns {Promise<Record<string, object>>} The parsed directory tree.
 */
export async function mainPrintTgzTree(filePath, options = {}) {
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

  printTgzTree(tree, '', logger);

  return tree;
}
