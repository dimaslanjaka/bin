/**
 * Centralized configuration for binary-collections
 */

const path = require('upath');
const { getArgs } = require('../utils/index.cjs');
const { findEnvWithToken } = require('../utils/findEnvFiles.cjs');
const dotenv = require('dotenv');
const { cosmiconfig } = require('cosmiconfig');
const os = require('os');
const fs = require('fs-extra');

/**
 * Load .env file containing a token variable.
 * Searches for `.env*` files and picks the first one matching the given token key.
 *
 * @param {string|RegExp} [tokenKey=/ACCESS_TOKEN|GITHUB_TOKEN/] - Token name or regex to search for.
 *   Passed as second argument to `findEnvWithToken()`.
 * @returns {import('dotenv').DotenvConfigOutput}
 */
const loadDotenv = (tokenKey = /ACCESS_TOKEN|GITHUB_TOKEN/) =>
  dotenv.config({
    path: findEnvWithToken(process.env.INIT_CWD || process.cwd(), tokenKey),
    quiet: true,
    overwrite: true
  });

/**
 * Get a temporary file or directory path under the project's temp directory.
 * Does NOT create the directory — the caller is responsible for that.
 *
 * @param {...string} segments - Path segments to join with the temp root.
 * @returns {string} The full temporary path rooted at `TEMP_DIR` env var or `<cwd>/tmp`.
 */
function getTempPath(...segments) {
  return path.join(process.env.TEMP_DIR || path.join(process.cwd(), 'tmp'), ...segments);
}

/**
 * Create a unique temporary directory and return its path.
 * Creates the directory immediately via `fs.mkdtempSync`.
 *
 * @param {object} [options] - Optional settings.
 * @param {string} [options.prefix='binary-collections-'] - Prefix for the directory name.
 * @param {boolean} [options.global=false] - Use OS temp dir instead of project temp root.
 * @returns {string} Absolute path to the newly created temp directory.
 */
function makeTempDir(options = {}) {
  const { prefix = 'binary-collections-', global = false } = options;
  const tempDir = global ? os.tmpdir() : getTempPath();
  return fs.mkdtempSync(path.join(tempDir, prefix));
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

/**
 * Get GitHub access token from CLI args, config file, or environment variables.
 * Checks --token CLI argument, then config `githubToken`, then ACCESS_TOKEN, GITHUB_TOKEN, GH_TOKEN env vars.
 * @returns {Promise<string|undefined>}
 */
async function getGithubToken() {
  // dotenv should always loaded
  loadDotenv();

  const cliArgv = getArgs({
    string: ['token']
  });

  if (cliArgv.token) return cliArgv.token;

  const config = await getConfig();
  if (config?.githubToken) return config.githubToken;

  return process.env.ACCESS_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
}

module.exports = {
  getTempPath,
  getGithubToken,
  loadDotenv,
  getConfig,
  makeTempDir
};
module.exports.default = module.exports;
