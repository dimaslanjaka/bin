const axios = require("axios");
const minimist = require("minimist");
const { findEnvWithToken } = require("./utils/findEnvFiles.cjs");

require("dotenv").config({
  path: findEnvWithToken(),
  quiet: true,
  overwrite: true
});

// delete caches leaving single last cache based on creation date
const ACCESS_TOKEN = process.env.GITHUB_TOKEN || process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  throw new Error(
    "Access token is not provided. Please set ACCESS_TOKEN or GITHUB_TOKEN in your environment variables."
  );
}

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
  npx -y binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz clean-github-actions-caches --repo owner/repo

  # Run via yarn dlx
  yarn dlx binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz clean-github-actions-caches

Notes:
  - Ensure ACCESS_TOKEN or GITHUB_TOKEN is set and has permissions to manage Actions caches.
  - Intended for repository maintainers with appropriate permissions.
`);
}

/**
 * Parsed CLI arguments.
 */
const argv = minimist(process.argv.slice(2), {
  alias: {
    h: "help",
    r: "repo"
  },
  string: ["repo"],
  boolean: ["help"]
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
function deleteGitHubActionsCache(GH_REPO, cacheId) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/repos/${GH_REPO}/actions/caches/${cacheId}`;
    const token = ACCESS_TOKEN;

    if (!token) {
      return reject(new Error("Access token is not provided"));
    }

    axios
      .delete(url, {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json"
        }
      })
      .then((response) => {
        console.log(`Cache (${cacheId}) deleted successfully`, response.data);
        resolve(response.data);
      })
      .catch((error) => {
        console.error("Error deleting cache:", error.response?.data || error.message || "Unknown error");

        reject(error);
      });
  });
}

/**
 * List GitHub Actions caches grouped by cache key prefix.
 *
 * @param {string} GH_REPO GitHub repository in format `owner/repo`.
 * @returns {Promise<Record<string, Record<string, any>[]>>}
 */
function get_caches(GH_REPO) {
  const url = `https://api.github.com/repos/${GH_REPO}/actions/caches`;

  return new Promise((resolve, reject) => {
    axios
      .get(url, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${ACCESS_TOKEN}`
        }
      })
      .then((response) => {
        /**
         * @type {Record<string, any>[]}
         */
        const data = response.data.actions_caches;

        /**
         * Extract cache prefix from cache key.
         *
         * @param {string} key
         * @returns {string}
         */
        const getPrefix = (key) => {
          const split = key.split(/[-_]/);

          if (split.length === 3) {
            return `${split[0]}-${split[1]}`;
          }

          if (split.length > 3) {
            return `${split[0]}-${split[1]}-${split[2]}`;
          }

          return split[0];
        };

        // Group by prefix
        const grouped = data.reduce(
          /**
           * @param {Record<string, Record<string, any>[]>} acc
           * @param {Record<string, any>} item
           * @returns {Record<string, Record<string, any>[]>}
           */
          (acc, item) => {
            const prefix = getPrefix(item.key);

            if (!acc[prefix]) {
              acc[prefix] = [];
            }

            acc[prefix].push(item);

            return acc;
          },
          {}
        );

        resolve(grouped);
      })
      .catch((error) => {
        // console.error("Error fetching data:", error);
        reject(error);
      });
  });
}

module.exports = {
  deleteGitHubActionsCache,
  get_caches
};
