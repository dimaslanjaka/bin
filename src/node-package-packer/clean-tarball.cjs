const fs = require('fs-extra');
const path = require('upath');
const tar = require('tar');

/**
 * Patterns for workspace artifact entries inside the pack tarball that are not
 * needed in the published package (submodule release tarballs, yarn releases).
 */
const workspaceArtifactPatterns = [
  /^package\/packages\/[^/]+\/release\/.+\.tgz$/,
  /^package\/packages\/[^/]+\/releases\/.+\.tgz$/,
  /^package\/packages\/[^/]+\/\.yarn\/releases\/.+\.cjs$/
];

/**
 * Check if a tarball entry path matches a workspace artifact pattern.
 * @param {string} entryPath - Path inside the tarball.
 * @returns {boolean}
 */
function isWorkspaceArtifact(entryPath) {
  return workspaceArtifactPatterns.some((re) => re.test(entryPath));
}

/**
 * Post-process a pack tarball: remove workspace artifact entries (submodule
 * release tarballs, yarn releases) that bloat the output. Works by extracting
 * to a temp directory with a filter, then repacking.
 *
 * @param {string} tarballPath - Path to the .tgz file to clean.
 * @param {object} [callbacks] - Optional callbacks from project config.
 * @param {Function} [callbacks.onFilter] - Filter tarball entries during
 *   cleanup. Return false to exclude. Configured via `packer.onFilter`.
 * @param {Function} [callbacks.onFinish] - Callback invoked after cleanup.
 *   Configured via `packer.onFinish`.
 * @returns {Promise<void>}
 */
async function cleanTarball(tarballPath, callbacks = {}) {
  if (!fs.existsSync(tarballPath)) return;

  const { onFilter, onFinish } = callbacks;
  const dir = path.dirname(tarballPath);
  const tmpDir = path.join(dir, '.tmp-tarball-clean');
  const basename = path.basename(tarballPath);

  // Track removed entries for logging
  const removed = [];

  try {
    // Ensure temp directory exists before extracting into it
    fs.mkdirpSync(tmpDir);

    // Extract everything to tmp, filtering out artifacts
    await tar.extract({
      file: tarballPath,
      cwd: tmpDir,
      filter: (entryPath) => {
        if (isWorkspaceArtifact(entryPath)) {
          removed.push(entryPath);
          return false;
        }

        // Custom user filter runs after built-in check
        if (typeof onFilter === 'function') {
          const result = onFilter(entryPath);
          if (result === false) {
            removed.push(entryPath);
            return false;
          }
        }

        return true;
      }
    });

    if (removed.length > 0) {
      // Remove original tarball
      fs.removeSync(tarballPath);
      // Repack from temp dir
      await tar.create(
        {
          file: tarballPath,
          gzip: true,
          cwd: tmpDir,
          portable: true
        },
        ['.']
      );

      for (const entry of removed) {
        console.log(`[bundle] stripped from tarball: ${entry}`);
      }
      console.log(`[bundle] cleaned ${basename}: removed ${removed.length} workspace artifact entries`);
    }

    // Fire onFinish regardless of whether entries were removed
    if (typeof onFinish === 'function') {
      // Callback-style: (path, cb) => void — promisified via pify
      if (onFinish.length >= 2) {
        const { default: pify } = await import('pify');
        await pify(onFinish)(tarballPath);
      } else {
        // Sync or async: await the return value if thenable
        const result = onFinish(tarballPath);
        if (result && typeof result.then === 'function') {
          await result;
        }
      }
    }
  } finally {
    // Always clean up temp dir
    if (fs.existsSync(tmpDir)) {
      fs.removeSync(tmpDir);
    }
  }
}

module.exports = { cleanTarball };
