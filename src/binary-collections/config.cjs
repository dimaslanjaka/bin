/**
 * Centralized configuration for binary-collections
 */

const path = require('upath');
const minimistLib = require('minimist');
const { findEnvWithToken } = require('../utils/findEnvFiles.cjs');
const dotenv = require('dotenv');
const { cosmiconfig } = require('cosmiconfig');

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
 * Get a temporary file or directory path
 * @param {...string} segments - Path segments to join with the temp directory
 * @returns {string} The full temporary path
 */
function getTempPath(...segments) {
  return path.join(process.env.TEMP_DIR || path.join(process.cwd(), 'tmp'), ...segments);
}

/**
 * Search for project configuration using cosmiconfig (async).
 *
 * Only `binary-collections.config.js` / `.cjs` / `.mjs` are supported (no `.rc`, JSON, or YAML).
 *
 * Looks for configuration in:
 * - `binary-collections.config.js` / `.cjs` / `.mjs` (searched from project root upward)
 * - A `binary-collections` property in `package.json`
 *
 * @param {object} [options] - Optional configuration overrides.
 * @param {string} [options.searchFrom] - Directory to start searching from (default: process.cwd()).
 * @param {string} [options.stopDir] - Directory to stop searching upwards (e.g., project root).
 * @returns {Promise<import('./config-types').BinaryCollectionsConfig|null>} The parsed configuration object, or `null` if no config found.
 */
async function getConfig(options = {}) {
  const explorer = cosmiconfig('binary-collections', {
    searchStrategy: 'project',
    stopDir: options.stopDir
  });

  try {
    const result = await explorer.search(options.searchFrom);
    return result ? result.config : null;
  } catch {
    return null;
  }
}

module.exports = {
  getTempPath,
  GITHUB_ACCESS_TOKEN,
  loadDotenv,
  getConfig
};
