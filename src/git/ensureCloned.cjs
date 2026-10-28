const { spawnSync } = require('cross-spawn');
const fs = require('fs-extra');
const path = require('upath');

/**
 * Run a git command inside cwd and return trimmed stdout, or null on failure.
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string|null}
 */
function gitQuery(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf-8' });
  if (r.status !== 0) return null;
  return r.stdout.trim();
}

/**
 * Normalize a git remote URL so HTTP and SSH variants compare equal.
 * Strips trailing .git, lowercases, converts git@host:owner/repo to host/owner/repo.
 * @param {string} url
 * @returns {string}
 */
function normalizeRemoteUrl(url) {
  let s = url.trim().toLowerCase();
  s = s.replace(/\.git$/, '');
  s = s.replace(/^git@([^:]+):/, '$1/');
  s = s.replace(/^https?:\/\//, '');
  return s;
}

/**
 * Clone url at branch into dest. When .git already exists, verifies:
 *  1. remote URL normalizes to the same value as url
 *  2. current branch matches branch
 *  3. git root resolves to dest
 * Re-clones (after removing the directory) if any check fails.
 *
 * @param {string} url    Remote repository URL.
 * @param {string} branch Branch to clone / verify.
 * @param {string} dest   Local destination path (absolute).
 */
function ensureCloned(url, branch, dest) {
  if (fs.existsSync(path.join(dest, '.git'))) {
    // 1. Verify remote URL
    const remoteUrl = gitQuery(['remote', 'get-url', 'origin'], dest);
    const remoteMatch = Boolean(remoteUrl) && normalizeRemoteUrl(remoteUrl) === normalizeRemoteUrl(url);

    // 2. Verify branch (--abbrev-ref returns 'HEAD' when detached; fall back to symbolic-ref)
    const headRef = gitQuery(['rev-parse', '--abbrev-ref', 'HEAD'], dest);
    let currentBranch;
    if (headRef === 'HEAD') {
      currentBranch = gitQuery(['symbolic-ref', '--short', 'HEAD'], dest);
    } else {
      currentBranch = headRef;
    }
    const branchMatch = currentBranch === branch;

    // 3. Verify git root resolves to dest
    const toplevel = gitQuery(['rev-parse', '--show-toplevel'], dest);
    const rootMatch = Boolean(toplevel) && path.normalizeTrim(toplevel) === path.normalizeTrim(dest);

    if (remoteMatch && branchMatch && rootMatch) return;

    console.warn(
      '[ensureCloned] mismatch at ' + dest + ':',
      'remote=' + (remoteMatch ? 'ok' : remoteUrl + ' != ' + url),
      'branch=' + (branchMatch ? 'ok' : currentBranch + ' != ' + branch),
      'root=' + (rootMatch ? 'ok' : toplevel + ' != ' + dest)
    );

    fs.removeSync(dest);
  }

  fs.ensureDirSync(path.dirname(dest));

  const result = spawnSync('git', ['clone', '--single-branch', '--branch', branch, '--depth', '1', url, dest], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error('git clone failed for ' + url + ' (branch: ' + branch + ') -> ' + dest);
  }
}

module.exports = { ensureCloned, normalizeRemoteUrl, gitQuery };
module.exports.default = module.exports;
