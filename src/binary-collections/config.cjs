/**
 * Centralized configuration for binary-collections
 */

const path = require('upath');
const { getArgs } = require('../utils/index.cjs');
const { findEnvWithToken } = require('../utils/findEnvFiles.cjs');
const dotenv = require('dotenv');
const { cosmiconfig } = require('cosmiconfig');

/**
 * Load .env file containing a token variable.
 * Searches for `.env*` files and picks the first one matching the given token key.
 *
 * @param {string|RegExp} [tokenKey=/ACCESS_TOKEN|GITHUB_TOKEN/] - Token name or regex to search for.
 *   Passed as second argument to `findEnvWithToken()`.
 * @returns {import('dotenv').DotenvConfigOutput}
 */
const loadDotenv = (tokenKey = /ACCESS_TOKEN|GITHUB_TOKEN/) =>
  dotenv.config({ path: findEnvWithToken(undefined, tokenKey), quiet: true, overwrite: true });
loadDotenv(); // Load .env file if it exists to populate process.env with tokens

// Support --token CLI argument to override GITHUB_ACCESS_TOKEN
const cliArgv = getArgs({
  string: ['token']
});
/** @type {string|undefined} */
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

const CONFIG_SEARCH_PLACES = Object.freeze([
  'binary-collections.config.js',
  'binary-collections.config.cjs',
  'binary-collections.config.mjs'
]);

/**
 * Search for project configuration using cosmiconfig.
 *
 * By default looks for these files:
 * - `binary-collections.config.js`
 * - `binary-collections.config.cjs`
 * - `binary-collections.config.mjs`
 *
 * No `.rc`, JSON, YAML, or `package.json` config is supported.
 *
 * @param {object} [options] - Optional configuration overrides.
 * @param {string} [options.optionName] - Override the cosmiconfig module name ('binary-collections' by default).
 *   When set, searchPlaces are generated as `{optionName}.config.{js,cjs,mjs}`.
 * @param {string} [options.searchFrom] - Directory to start searching from.
 * @param {string} [options.stopDir] - Directory to stop searching upwards.
 * @returns {Promise<import('./config-types').BinaryCollectionsConfig|null>}
 */
async function getConfig(options = {}) {
  const moduleName = options.optionName || 'binary-collections';
  const from = path.resolve(options.searchFrom || process.env.INIT_CWD || process.cwd());

  const searchPlaces =
    moduleName === 'binary-collections'
      ? CONFIG_SEARCH_PLACES
      : [`${moduleName}.config.js`, `${moduleName}.config.cjs`, `${moduleName}.config.mjs`];

  const explorer = cosmiconfig(moduleName, {
    searchStrategy: 'project',
    stopDir: options.stopDir,
    searchPlaces
  });

  try {
    const result = await explorer.search(from);
    return result?.config || null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(`Failed to load binary-collections config from "${from}": ${message}`, {
      cause: error
    });
  }
}

module.exports = {
  getTempPath,
  GITHUB_ACCESS_TOKEN,
  loadDotenv,
  getConfig
};
