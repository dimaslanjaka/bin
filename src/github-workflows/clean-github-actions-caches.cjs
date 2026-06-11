const axios = require('axios');
const { getArgs } = require('../utils/index.cjs');
const { getGithubToken } = require('../binary-collections/config.cjs');

/**
 * Print CLI help message.
 *
 * @returns {void}
 */
function printHelp() {
  console.log(`
GitHub Actions Cache Cleaner

Description:
  Removes outdated GitHub Actions caches for a repository, keeping only the newest
  cache for each cache-key prefix. Authenticates via ACCESS_TOKEN or GITHUB_TOKEN
  from your environment or .env file.

Usage:
  clean-github-actions-caches [options]

Options:
  -h, --help           Show this help message
  -r, --repo <repo>    GitHub repository (owner/repo). If omitted, the tool will
                       attempt to infer the repository from the current working
                       directory's git remotes.
    -p, --prefix-depth <n>
                         Number of leading cache key segments to use as the
                         grouping prefix when splitting on /[-_]/. Default: 3.

Environment Variables:
  ACCESS_TOKEN         GitHub access token (preferred)
  GITHUB_TOKEN         GitHub access token (fallback)

Behavior & Safety:
  - Groups caches by a derived prefix from the cache key and keeps the most
    recently created cache for each group.
  - Deletes only caches older than the latest per prefix to reduce risk of
    removing needed artifacts.

Examples:
  # Run against a specific repo (owner/repo)
  clean-github-actions-caches --repo octocat/hello-world

  # Run via npx without installing
    npx --legacy-peer-deps -y binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz clean-github-actions-caches --repo owner/repo --prefix-depth 3

  # Run via yarn dlx
    yarn dlx binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz clean-github-actions-caches --prefix-depth 3

Notes:
  - Ensure ACCESS_TOKEN or GITHUB_TOKEN is set and has permissions to manage Actions caches.
  - Intended for repository maintainers with appropriate permissions.
`);
}

/**
 * Parsed CLI arguments.
 */
const argv = getArgs({
  alias: {
    h: 'help',
    p: 'prefix-depth',
    r: 'repo'
  },
  string: ['prefix-depth', 'repo'],
  boolean: ['help']
});

if (argv.help) {
  printHelp();
  process.exit(0);
}

/**
 * Deletes a GitHub Actions cache.
 *
 * @param {string} GH_REPO - The GitHub repository in the format "owner/repo".
 * @param {string|number} cacheId - The ID of the cache to delete.
 * @returns {Promise<any>} Promise resolving with GitHub API response.
 */
async function deleteGitHubActionsCache(GH_REPO, cacheId) {
  const token = await getGithubToken();

  if (!token) {
    throw new Error('Access token is not provided');
  }

  try {
    const response = await axios.delete(`https://api.github.com/repos/${GH_REPO}/actions/caches/${cacheId}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });
    console.log(`Cache (${cacheId}) deleted successfully`, response.data);
    return response.data;
  } catch (error) {
    console.error('Error deleting cache:', error.response?.data || error.message || 'Unknown error');
    throw error;
  }
}

/**
 * Normalize the number of cache key segments to use for grouping.
 *
 * @param {unknown} prefixDepth
 * @returns {number}
 */
function normalizePrefixDepth(prefixDepth) {
  const parsed = Number(prefixDepth);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 3;
  }

  return Math.floor(parsed);
}

/**
 * Detect cache-key segments that look like checksum hashes.
 *
 * @param {string} segment
 * @returns {boolean}
 */
function isChecksumSegment(segment) {
  return /^[a-f0-9]{32,}$/i.test(segment);
}

/**
 * Remove checksum-like segments from a cache key.
 *
 * @param {string} key
 * @returns {string[]}
 */
function getMeaningfulCacheKeyParts(key) {
  return String(key)
    .split(/[-_]/)
    .filter(Boolean)
    .filter((segment) => !isChecksumSegment(segment));
}

/**
 * Extract the grouping prefix from a cache key.
 *
 * @param {string} key
 * @param {number} [prefixDepth=3]
 * @returns {string}
 */
function getCachePrefix(key, prefixDepth = 3) {
  const normalizedDepth = normalizePrefixDepth(prefixDepth);
  const parts = String(key).split(/[-_]/).filter(Boolean);
  const meaningfulParts = getMeaningfulCacheKeyParts(key);

  if (meaningfulParts.length !== parts.length) {
    if (meaningfulParts.length < normalizedDepth) {
      return `${meaningfulParts.join('-')}-`;
    }

    return meaningfulParts.join('-');
  }

  if (parts.length <= normalizedDepth) {
    return parts.join('-');
  }

  return parts.slice(0, normalizedDepth).join('-');
}

/**
 * Group GitHub Actions caches by their derived prefix.
 *
 * @param {Record<string, any>[]} caches
 * @param {number} [prefixDepth=3]
 * @returns {Record<string, Record<string, any>[]>}
 */
function groupCachesByPrefix(caches, prefixDepth = 3) {
  return caches.reduce(
    /**
     * @param {Record<string, Record<string, any>[]>} acc
     * @param {Record<string, any>} item
     * @returns {Record<string, Record<string, any>[]>}
     */
    (acc, item) => {
      const prefix = getCachePrefix(item.key, prefixDepth);

      if (!acc[prefix]) {
        acc[prefix] = [];
      }

      acc[prefix].push(item);

      return acc;
    },
    {}
  );
}

/**
 * List GitHub Actions caches grouped by cache key prefix.
 *
 * @param {string} GH_REPO GitHub repository in format `owner/repo`.
 * @param {number} [prefixDepth=3]
 * @returns {Promise<Record<string, Record<string, any>[]>>}
 */
async function get_caches(GH_REPO, prefixDepth = 3) {
  const token = await getGithubToken();
  const url = `https://api.github.com/repos/${GH_REPO}/actions/caches`;

  const response = await axios.get(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token}`
    }
  });
  /**
   * @type {Record<string, any>[]}
   */
  const data = response.data.actions_caches;
  return groupCachesByPrefix(data, prefixDepth);
}

module.exports = {
  deleteGitHubActionsCache,
  getCachePrefix,
  getMeaningfulCacheKeyParts,
  get_caches,
  groupCachesByPrefix,
  isChecksumSegment,
  normalizePrefixDepth
};

// Provide a "default" alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
