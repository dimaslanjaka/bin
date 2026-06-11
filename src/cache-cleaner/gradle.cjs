const glob = require('glob');
const os = require('os');
const path = require('upath');
const { del } = require('../utils/index.cjs');

/**
 * @typedef {Object} GradleProject
 * @property {string} gradleFile - Absolute path to the build.gradle file
 * @property {string} buildDir - Absolute path to the sibling build/ directory
 */

/**
 * Default glob patterns to ignore when searching for build.gradle files.
 */
const DEFAULT_IGNORE = ['**/node_modules/**', '**/vendor/**'];

/**
 * Finds all Gradle projects under the given directory by locating build.gradle files.
 *
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.cwd] - Working directory (defaults to process.cwd())
 * @param {string[]} [options.ignore] - Glob patterns to ignore (defaults to node_modules and vendor)
 * @returns {Promise<GradleProject[]>} Resolves with an array of Gradle project info
 */
function findGradleProjects(options = {}) {
  const cwd = options.cwd || process.cwd();
  const ignore = options.ignore || DEFAULT_IGNORE;

  return new Promise((resolve, reject) => {
    const projects = [];

    try {
      const globStream = new glob.Glob(['**/build.gradle'], {
        withFileTypes: false,
        cwd,
        ignore
      });

      globStream.stream().on('data', (result) => {
        const fullPath = path.resolve(cwd, result);
        const base = path.dirname(fullPath);
        const buildDir = path.join(base, 'build');

        projects.push({ gradleFile: fullPath, buildDir });
      });

      globStream.stream().on('end', () => {
        resolve(projects);
      });

      globStream.stream().on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Removes the build/ directory for each Gradle project found.
 * Logs each deletion unless `silent` is true.
 *
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.cwd] - Working directory (defaults to process.cwd())
 * @param {string[]} [options.ignore] - Glob patterns to ignore
 * @param {boolean} [options.silent] - Suppress console output (defaults to false)
 * @param {import('fs').RmOptions} [options.delOptions] - Extra options passed to the del utility
 * @returns {Promise<string[]>} Resolves with the list of deleted build directories
 */
async function cleanGradleBuildDirs(options = {}) {
  const silent = options.silent || false;
  const projects = await findGradleProjects(options);
  const deletedDirs = [];

  for (const { buildDir } of projects) {
    if (!silent) {
      console.log('delete build folder', buildDir);
    }

    del(buildDir);
    deletedDirs.push(buildDir);
  }

  return deletedDirs;
}

/**
 * Default Gradle cache/temp subdirectory names (relative to the Gradle user home).
 * These cover the main cache artifacts that can be safely cleaned between builds.
 */
const GRADLE_CACHE_SUBDIRS = ['caches', 'wrapper/dists', 'daemon', 'native', 'buildOutputCleanup'];

/**
 * Returns the Gradle user home directory path.
 * Typically `~/.gradle` on Linux/macOS or `%USERPROFILE%\\.gradle` on Windows.
 *
 * @returns {string} Absolute path to the Gradle user home
 */
function getGradleUserHome() {
  return path.join(os.homedir(), '.gradle');
}

/**
 * Returns known Gradle cache and temp directories.
 *
 * The primary locations are subdirectories of the Gradle user home (`~/.gradle`):
 * - `caches/` — module artifacts, transformed classes, build scans
 * - `wrapper/dists/` — downloaded Gradle wrapper distributions
 * - `daemon/` — daemon registry and output logs
 * - `native/` — native-platform library extraction
 * - `buildOutputCleanup/` — cache for build output cleanup
 *
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.gradleUserHome] - Custom Gradle user home (defaults to os.homedir() + '/.gradle')
 * @param {boolean} [options.onlyExisting] - Only return directories that currently exist (default false)
 * @returns {Promise<string[]>} Resolves with absolute paths to Gradle cache/temp directories
 */
async function getGradleCacheDirs(options = {}) {
  const gradleHome = options.gradleUserHome || getGradleUserHome();
  const dirs = [];

  for (const sub of GRADLE_CACHE_SUBDIRS) {
    dirs.push(path.join(gradleHome, sub));
  }

  if (options.onlyExisting) {
    const fs = require('fs-extra');
    const exists = await Promise.all(dirs.map((d) => fs.pathExists(d)));
    return dirs.filter((_, i) => exists[i]);
  }

  return dirs;
}

/**
 * Removes known Gradle cache and temp directories.
 * Each deleted path is logged unless `silent` is true.
 *
 * @param {Object} [options] - Optional configuration
 * @param {string} [options.gradleUserHome] - Custom Gradle user home
 * @param {boolean} [options.silent] - Suppress console output (defaults to false)
 * @param {boolean} [options.onlyExisting] - Only attempt deletion on directories that exist (default false)
 * @returns {Promise<string[]>} Resolves with the list of deleted directories
 */
async function cleanGradleCacheDirs(options = {}) {
  const silent = options.silent || false;
  const dirs = await getGradleCacheDirs(options);
  const deleted = [];

  for (const dir of dirs) {
    if (!silent) {
      console.log('delete gradle cache dir', dir);
    }
    del(dir);
    deleted.push(dir);
  }

  return deleted;
}

module.exports = {
  findGradleProjects,
  cleanGradleBuildDirs,
  getGradleCacheDirs,
  cleanGradleCacheDirs,
  GRADLE_CACHE_SUBDIRS,
  DEFAULT_IGNORE
};
// Provide a `default` alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
