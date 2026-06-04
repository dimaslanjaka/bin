const fs = require('fs-extra');
const glob = require('glob');
const path = require('upath');
const CryptoJS = require('crypto-js');

const globSync = typeof glob.sync === 'function' ? glob.sync : glob.globSync;

/**
 * Get all files matching the given glob patterns, ignoring specified paths.
 * @param {{ patterns: string[], ignore: string[], cwd?: string }} options
 * @returns {string[]}
 */
function getAllFiles({ patterns = [], ignore = [], cwd } = {}) {
  const files = new Set();
  const root = path.resolve(cwd || process.cwd());

  for (const pattern of patterns) {
    const matched = globSync(pattern, {
      cwd: root,
      nodir: true,
      ignore,
      absolute: false
    });

    for (const f of matched) {
      // Resolve to absolute path for consistent hashing
      files.add(path.normalize(path.resolve(root, f)));
    }
  }

  return Array.from(files).sort();
}

/**
 * Check if a file is binary by scanning for null bytes in the first N bytes.
 * @param {string} filePath - Absolute path to the file
 * @param {number} [bytesToCheck=8000] - Number of bytes to scan from the start
 * @returns {boolean}
 */
function isBinaryFile(filePath, bytesToCheck = 8000) {
  const size = Math.max(0, Number(bytesToCheck) || 0);

  if (size === 0) {
    // Optionally, check if it decodes as UTF-8
    return false;
  }

  const fd = fs.openSync(filePath, 'r');

  try {
    const buffer = Buffer.allocUnsafe(size);
    const bytesRead = fs.readSync(fd, buffer, 0, size, 0);

    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        // Null byte is a strong indicator of binary
        return true;
      }
    }

    // Optionally, check if it decodes as UTF-8
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Compute a SHA-256 hex digest for a file. For text files, the content is
 * normalized (whitespace collapsed) before hashing. For binary files, the path
 * and size are hashed instead of content.
 * @private
 * @param {string} file - Absolute path to the file
 * @returns {string}
 */
function hashFile(file) {
  if (!isBinaryFile(file)) {
    const content = fs.readFileSync(file, 'utf8');
    // remove whitespaces and newlines for text files to avoid irrelevant changes affecting the checksum
    const normalized = content.replace(/\s+/g, ' ').trim();

    return CryptoJS.SHA256(normalized).toString(CryptoJS.enc.Hex);
  }

  // For binary files, hash the file path and size instead of content
  const stats = fs.statSync(file);
  const binHash = CryptoJS.algo.SHA256.create();

  binHash.update(file);
  binHash.update(String(stats.size));

  return binHash.finalize().toString(CryptoJS.enc.Hex);
}

/**
 * Build a combined SHA-256 checksum from an ordered list of files.
 * For each file, both its path and content hash are fed into the digest.
 * @param {string[]} files - Ordered list of absolute file paths
 * @returns {string}
 */
function buildChecksum(files = []) {
  const hash = CryptoJS.algo.SHA256.create();

  for (const file of files) {
    hash.update(file);
    hash.update(hashFile(file));
  }

  return hash.finalize().toString(CryptoJS.enc.Hex);
}

/**
 * Compute a SHA-256 hash of the given data, optionally trimming the output to a specified length.
 * @param {string} data
 * @param {number} trim
 * @returns {string}
 */
function sha256(data, trim = 128) {
  const hash = CryptoJS.SHA256(String(data)).toString(CryptoJS.enc.Hex);
  return trim ? hash.substring(0, trim) : hash;
}

module.exports = { getAllFiles, buildChecksum, sha256 };
