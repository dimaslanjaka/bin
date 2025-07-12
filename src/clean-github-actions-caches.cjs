const axios = require("axios");
const { parseGitRemotes } = require("./utils");
const path = require("upath");
const fs = require("fs");
const projectDir = process.cwd();
const envPath = path.join(projectDir, ".env");

// Load the .env file using dotenv
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  console.warn(`.env file not found at ${envPath}`);
}

// delete caches leaving single last cache based on creation date

const ACCESS_TOKEN = process.env.ACCESS_TOKEN || process.env.GITHUB_TOKEN;

if (!ACCESS_TOKEN) {
  throw new Error(
    "Access token is not provided. Please set ACCESS_TOKEN or GITHUB_TOKEN in your environment variables."
  );
}

/**
 * Deletes a GitHub Actions cache.
 * @param {string} GH_REPO - The GitHub repository in the format "owner/repo".
 * @param {string} cacheId - The ID of the cache to delete.
 * @returns {Promise} - A promise that resolves on success and rejects on error.
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
        resolve(response.data); // Resolve with the response data
      })
      .catch((error) => {
        console.error("Error deleting cache:", error.response?.data || error.message || "Unknown error");
        reject(error); // Reject with the error
      });
  });
}

/**
 * list github actions caches
 * @param {string} GH_REPO
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
        // resolve(response.data);
        /**
         * extract the prefix from the key
         * @param {string} key
         * @returns
         */
        const getPrefix = (key) => {
          const split = key.split(/[-_]/);
          if (split.length == 3) {
            return `${split[0]}-${split[1]}`;
          } else if (split.length > 3) {
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

        // Convert the grouped object into an array of arrays
        // const result = Object.values(grouped);
        resolve(grouped);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        reject(error); // Reject the promise with the error
      });
  });
}

/**
 * Deletes old GitHub Actions caches for the current repository (origin remote),
 * keeping only the most recent cache for each prefix (based on creation date).
 * Retrieves caches, groups by prefix, sorts by creation date, and deletes all but the latest.
 */
(async () => {
  try {
    const remotes = await parseGitRemotes();
    const GH_REPO = remotes.origin;
    const caches = await get_caches(GH_REPO);

    for (const key in caches) {
      if (Object.hasOwnProperty.call(caches, key)) {
        const items = caches[key]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .map((item) => ({
            ...item,
            human_readable_date: new Date(item.created_at).toLocaleString()
          }));

        if (items.length > 1) {
          const ids = items.map((o) => o.id);
          ids.shift(); // keep the most recent cache
          if (ids.length > 0) {
            for (const id of ids) {
              try {
                await deleteGitHubActionsCache(GH_REPO, id);
              } catch (err) {
                console.error(`Error deleting cache ${id}:`, err);
              }
            }
          } else {
            console.log(`cache prefix ${key} no cache left`);
          }
        } else {
          console.log(`cache prefix ${key} only have 1 cache`);
        }
      }
    }
  } catch (e) {
    console.error(`Error: ${e}`);
  }
})();
