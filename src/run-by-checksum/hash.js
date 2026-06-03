import fs from 'fs-extra';
import * as glob from 'glob';
import upath from 'upath';
import path from 'upath';
import crypto from 'crypto';

/**
 * Get all files matching the given glob patterns, ignoring specified paths.
 * @param {{ patterns: string[], ignore: string[], cwd?: string }} options
 * @returns {string[]}
 */
export function getAllFiles({ patterns, ignore, cwd }) {
  const files = new Set();
  const root = cwd || process.cwd();

  for (const pattern of patterns) {
    const matched = glob.sync(pattern, {
      cwd: root,
      nodir: true,
      ignore
    });

    for (const f of matched) {
      // Resolve to absolute path for consistent hashing
      files.add(upath.normalize(path.resolve(root, f)));
    }
  }

  return [...files].sort();
}

/**
 * Compute the SHA-256 hex digest of a file's contents.
 * @private
 * @param {string} file - Absolute path to the file
 * @returns {string}
 */
function hashFile(file) {
  const content = fs.readFileSync(file);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Build a combined SHA-256 checksum from an ordered list of files.
 * For each file, both its path and content hash are fed into the digest.
 * @param {string[]} files - Ordered list of absolute file paths
 * @returns {string}
 */
export function buildChecksum(files) {
  const hash = crypto.createHash('sha256');

  for (const file of files) {
    hash.update(file);
    hash.update(hashFile(file));
  }

  return hash.digest('hex');
}
