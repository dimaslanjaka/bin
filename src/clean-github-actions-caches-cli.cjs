const { get_caches, deleteGitHubActionsCache } = require('./clean-github-actions-caches.cjs');
const { parseGitRemotes } = require('./utils/index.cjs');

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
                const code = err.response?.status || err.code || 'UNKNOWN';
                const message = err.response?.statusText || err.message || 'Unknown error';
                console.error(`Error deleting cache ${id}: [${code}] [${message}]\n${err.stack}`);
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
    const code = e.response?.status || e.code || 'UNKNOWN';
    const message = e.response?.statusText || e.message || 'Unknown error';
    console.error(`[${code}] [${message}]\n${e.stack}`);
    process.exit(1);
  }
})();
