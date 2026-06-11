const { spawnSync } = require('cross-spawn');

/**
 * Parse a GitHub remote URL to owner/repo slug.
 * Handles both SSH (git@github.com:owner/repo.git) and HTTPS formats.
 * @param {string} url
 * @returns {string|null}
 */
function parseRepoSlug(url) {
  const normalized = url.trim().replace(/\.git$/i, '');
  const match = normalized.match(/github\.com[:/]([^/]+)\/([^/]+)$/i);
  if (!match) return null;
  return `${match[1]}/${match[2]}`;
}

/**
 * Collect a set of identifiers for the current git repo by probing multiple signals:
 * 1. Remote origin URL parsed as owner/repo
 * 2. Git toplevel directory basename (e.g. "binary-collections" from /path/to/binary-collections)
 * 3. Root package.json name field
 * Handles cases where the remote URL doesn't match the repo's canonical name.
 * @returns {Set<string>}
 */
function getCurrentRepoIdentifiers() {
  const ids = new Set();

  // 1. Remote origin URL → owner/repo slug
  try {
    const result = spawnSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf-8' });
    if (result.status === 0 && result.stdout) {
      const slug = parseRepoSlug(result.stdout);
      if (slug) ids.add(slug);
    }
  } catch {
    /* no remote */
  }

  // 2. Git toplevel directory basename
  try {
    const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' });
    if (result.status === 0 && result.stdout) {
      const basename = result.stdout.trim().split(/[\\/]/).filter(Boolean).pop();
      if (basename) ids.add(basename);
    }
  } catch {
    /* not a git repo */
  }

  // 3. Root package.json name field
  try {
    const pkgPath = require('path').resolve(process.cwd(), 'package.json');
    const pkg = require(pkgPath);
    if (pkg.name) ids.add(pkg.name);
  } catch {
    /* no package.json */
  }

  return ids;
}

/**
 * Get the set of repo slugs (owner/repo) from .gitmodules submodules.
 * These repos are populated by `git submodule update --init --recursive`,
 * so separate checkout steps are redundant.
 * @returns {Set<string>}
 */
function getSubmoduleRepos() {
  const repos = new Set();
  try {
    const result = spawnSync('git', ['config', '--file', '.gitmodules', '--list'], { encoding: 'utf-8' });
    if (result.status !== 0 || !result.stdout) return repos;
    const lines = result.stdout.trim().split('\n');
    for (const line of lines) {
      if (!line.includes('.url=')) continue;
      const url = line.split('=', 2)[1];
      if (!url) continue;
      const slug = parseRepoSlug(url);
      if (slug) repos.add(slug);
    }
  } catch {
    // .gitmodules doesn't exist or git isn't available
  }
  return repos;
}

/**
 * Determine if a given RepoInfo entry should be skipped.
 * @param {{ repo: string, path: string }} entry
 * @param {Set<string>} currentRepoIds
 * @param {Set<string>} submoduleRepos
 * @returns {string|false} Reason string if should skip, false if should keep
 */
function shouldSkipEntry(entry, currentRepoIds, submoduleRepos) {
  const pathBasename = entry.path.split('/').pop();
  // Check if this entry matches the current repo (by slug or path basename)
  if (currentRepoIds.has(entry.repo) || currentRepoIds.has(pathBasename)) {
    return 'current repo';
  }
  // Check if this repo is already managed as a submodule
  if (submoduleRepos.has(entry.repo)) {
    return 'submodule';
  }
  return false;
}

/**
 * Filter a RepoInfo array to remove entries for the current repo and submodule-managed repos.
 * @param {Array<{repo: string, path: string, ref: string}>} repoInfo
 * @param {object} [options]
 * @param {string} [options.logPrefix] - Prefix for log messages (default: '[repo-verifier]')
 * @returns {Array<{repo: string, path: string, ref: string}>}
 */
function filterRepoInfo(repoInfo, options = {}) {
  const prefix = options.logPrefix || '[repo-verifier]';
  const currentRepoIds = getCurrentRepoIdentifiers();
  const submoduleRepos = getSubmoduleRepos();

  return repoInfo.filter((entry) => {
    const reason = shouldSkipEntry(entry, currentRepoIds, submoduleRepos);
    if (reason) {
      console.log(`${prefix} Skipping clone of ${entry.path} (${entry.repo}): ${reason}`);
      return false;
    }
    return true;
  });
}

module.exports = {
  parseRepoSlug,
  getCurrentRepoIdentifiers,
  getSubmoduleRepos,
  shouldSkipEntry,
  filterRepoInfo
};

// Provide a "default" alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
