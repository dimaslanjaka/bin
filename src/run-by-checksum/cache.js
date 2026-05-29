import fs from 'fs-extra';
import path from 'upath';
import crypto from 'crypto';

/**
 * @param {string} str
 * @returns {string}
 */
function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * @param {{ patterns: string[], ignore: string[], cwd?: string }} options
 * @returns {string}
 */
export function getCacheFile({ patterns, ignore, cwd }) {
  const root = cwd || process.env.INIT_CWD || process.cwd();

  const key = md5(
    JSON.stringify({
      patterns: [...patterns].sort(),
      ignore: [...ignore].sort()
    })
  );

  return path.join(root, 'tmp', '.checksum', `${key}.json`);
}

/**
 * @param {string} file
 * @returns {object|null}
 */
export function loadCache(file) {
  try {
    return fs.readJsonSync(file);
  } catch {
    return null;
  }
}

/**
 * @param {string} file
 * @param {object} data
 */
export function saveCache(file, data) {
  fs.ensureDirSync(path.dirname(file));
  fs.writeJsonSync(file, data, { spaces: 2 });
}
