/**
 * normalize-resolutions.mjs
 *
 * Normalizes pinned commit hashes in package.json resolutions to
 * branch/tag names, so the packed tarball contains friendly references.
 *
 * Usage (library):
 *   import { normalizeResolutions, restoreResolutions } from './normalize-resolutions.mjs';
 *   await normalizeResolutions('/path/to/project');  // apply normalization
 *   restoreResolutions('/path/to/project');          // restore from backup
 * Designed to run before `npm pack` / `yarn pack`.
 */

import fs from 'fs-extra';
import path from 'upath';
import { getConfig, getTempPath } from '../binary-collections/config.cjs';

/**
 * Hash pattern: any 40-character hex string between `/raw/` and the next `/`.
 * This avoids hardcoding commit hashes that change on every update.
 */
const HASH_PATTERN = /(?<=\/raw\/)[a-f0-9]{40}(?=\/)/;

const DEFAULT_RESOLUTIONS_NORMALIZE = [
  { pkg: 'cross-spawn', to: 'private' },
  { pkg: 'binary-collections', to: 'master' },
  { pkg: 'git-command-helper', to: 'pre-release' },
  { pkg: 'sbg-utility', to: 'sbg-utility' }
];

/**
 * Compute the backup file path for a project root.
 * Uses the package name and version from its package.json.
 * Stores in the project temp directory (getTempPath).
 * @param {string} rootDir - Project root directory
 * @returns {string} Backup path under getTempPath('normalize-resolutions/')
 */
function getBackupPath(rootDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  return getTempPath('normalize-resolutions', `${pkg.name}-${pkg.version}.json`);
}

/**
 * Restore the original package.json from the backup file.
 * Backup is stored under getTempPath('normalize-resolutions/').
 * Removes the backup file after successful restore.
 * @param {string} rootDir - Project root directory containing package.json
 */
export function restoreResolutions(rootDir) {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const backupPath = getBackupPath(rootDir);
  if (!fs.existsSync(backupPath)) {
    console.error('[normalize-resolutions] no backup found at', backupPath);
    process.exit(1);
  }
  const original = fs.readFileSync(backupPath, 'utf-8');
  if (!original.trim()) {
    console.log('[normalize-resolutions] backup is empty, nothing to restore');
    return;
  }
  fs.writeFileSync(packageJsonPath, original);
  // remove backup after restore
  if (fs.existsSync(backupPath)) {
    fs.removeSync(backupPath);
  }
  console.log('[normalize-resolutions] restored original package.json');
}

/**
 * Normalize pinned commit hashes in package.json resolutions to
 * branch/tag names. Loads normalization mappings from config
 * (binary-collections.config.js) or falls back to defaults.
 * Backup is stored under getTempPath('normalize-resolutions/').
 * @param {string} rootDir - Project root directory containing package.json
 * @returns {Promise<boolean>} `true` if changes were made (backup saved), `false` if no-op.
 */
export async function normalizeResolutions(rootDir) {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const config = await getConfig();
  const resolutionsNormalize = config?.normalizeResolutions || DEFAULT_RESOLUTIONS_NORMALIZE;

  const raw = fs.readFileSync(packageJsonPath, 'utf-8');
  const pkg = JSON.parse(raw);
  if (!pkg.resolutions || Object.keys(pkg.resolutions).length === 0) {
    console.log('[normalize-resolutions] no resolutions to normalize');
    return false;
  }

  const backupPath = getBackupPath(rootDir);

  // ensure backup directory exists
  fs.ensureDirSync(path.dirname(backupPath));

  // save backup
  fs.copyFileSync(packageJsonPath, backupPath);

  let changed = false;
  for (const entry of resolutionsNormalize) {
    const url = pkg.resolutions[entry.pkg];
    if (url && HASH_PATTERN.test(url)) {
      pkg.resolutions[entry.pkg] = url.replace(HASH_PATTERN, entry.to);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('[normalize-resolutions] normalized resolutions for packing');
    console.log('[normalize-resolutions] backup saved to', backupPath);
  } else {
    // no changes — clean up the pointless backup
    if (fs.existsSync(backupPath)) {
      fs.removeSync(backupPath);
    }
    console.log('[normalize-resolutions] no changes needed');
  }
  return changed;
}
