/**
 * Centralized configuration for binary-collections
 * This module provides a consistent way to handle temporary directories and other configuration across the project.
 *
 * Usage:
 * const { getTempDir, getTempPath } = require('./binary-collections-config');
 *
 * // Get base temp directory
 * const tempDir = getTempDir();
 *
 * // Get specific temp path
 * const myTempPath = getTempPath('my-module', 'output.txt');
 */

const path = require('upath');
const minimistLib = require('minimist');
const { findEnvWithToken } = require('../utils/findEnvFiles.cjs');
const dotenv = require('dotenv');

/**
 * Load .env file containing a token variable.
 * Searches for `.env*` files and picks the first one matching the given token key.
 *
 * @param {string|RegExp} [tokenKey=/ACCESS_TOKEN|GITHUB_TOKEN/] - Token name or regex to search for.
 *   Passed as second argument to `findEnvWithToken()`.
 * @returns {void}
 */
const loadDotenv = (tokenKey = /ACCESS_TOKEN|GITHUB_TOKEN/) =>
  dotenv.config({ path: findEnvWithToken(undefined, tokenKey), quiet: true, overwrite: true });
loadDotenv(); // Load .env file if it exists to populate process.env with tokens

// Support --token CLI argument to override GITHUB_ACCESS_TOKEN
const cliArgv = minimistLib(process.argv.slice(2), {
  string: ['token']
});
const GITHUB_ACCESS_TOKEN =
  cliArgv.token || process.env.ACCESS_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

/**
 * Get the base temporary directory path
 * Can be overridden via TEMP_DIR environment variable
 * @returns {string} The base temporary directory path
 */
function getTempDir() {
  return process.env.TEMP_DIR || path.join(process.cwd(), 'tmp');
}

/**
 * Get a temporary file or directory path
 * @param {...string} segments - Path segments to join with the temp directory
 * @returns {string} The full temporary path
 */
function getTempPath(...segments) {
  return path.join(getTempDir(), ...segments);
}

/**
 * Legacy aliases for backward compatibility
 */
const TEMP_BASE_DIR = getTempDir();

module.exports = {
  getTempDir,
  getTempPath,
  TEMP_BASE_DIR,
  GITHUB_ACCESS_TOKEN,
  loadDotenv
};
