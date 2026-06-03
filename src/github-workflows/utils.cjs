/**
 * Shared utilities for GitHub Actions workflow operations.
 *
 * Extracted from get-latest-workflow-status.mjs and workflow-badge-cli.mjs
 * to eliminate code duplication.
 */

const axios = require('axios');
const { spawn } = require('cross-spawn');
const { GITHUB_ACCESS_TOKEN: TOKEN } = require('../binary-collections/config.cjs');

if (!TOKEN) {
  console.error('Missing env var: ACCESS_TOKEN or GITHUB_TOKEN');
  process.exit(1);
}

const BASE = 'https://api.github.com';
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
};

// ─── API request ───────────────────────────────────────────

/**
 * Make a GET request to the GitHub REST API.
 * @param {string} url - Full URL to fetch
 * @returns {Promise<object>} Response JSON body
 */
async function request(url) {
  try {
    const res = await axios.get(url, { headers: HEADERS });
    return res.data;
  } catch (err) {
    if (err?.response) {
      const statusText = err.response.statusText || 'Request failed';
      const responseText =
        typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data);
      throw new Error(`${err.response.status} ${statusText}\n${responseText}`);
    }
    throw err;
  }
}

// ─── Git helpers ────────────────────────────────────────────

/**
 * Run a git command and return stdout.
 * @param {string[]} args - Arguments to pass to git
 * @returns {Promise<string>} Trimmed stdout
 */
function runGit(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve(stdout.trim());
      reject(new Error(stderr.trim() || `git ${args.join(' ')} exited with code ${code}`));
    });
  });
}

/**
 * Parse owner and repo from a GitHub remote URL.
 * @param {string} remoteUrl - e.g. "git@github.com:owner/repo.git"
 * @returns {{owner: string, repo: string}|null} Parsed groups or null
 */
function parseOwnerFromUrl(remoteUrl) {
  const normalized = remoteUrl.trim().replace(/\.git$/i, '');
  const match = normalized.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/]+)$/i);
  return match?.groups || null;
}

/**
 * Extract the owner from a GitHub remote URL.
 * @param {string} remoteUrl
 * @returns {string|null}
 */
function getOwnerFromRemoteUrl(remoteUrl) {
  const parsed = parseOwnerFromUrl(remoteUrl);
  return parsed?.owner || null;
}

/**
 * Extract the repo name from a GitHub remote URL.
 * @param {string} remoteUrl
 * @returns {string|null}
 */
function getRepoFromRemoteUrl(remoteUrl) {
  const parsed = parseOwnerFromUrl(remoteUrl);
  return parsed?.repo || null;
}

/**
 * Determine the repository owner from the local git remote.
 * Tries multiple git command variants.
 * @returns {Promise<string>}
 */
async function getCurrentOwner() {
  const commands = [
    ['config', '--local', '--get', 'remote.origin.url'],
    ['remote', 'get-url', 'origin']
  ];
  for (const args of commands) {
    try {
      const remoteUrl = await runGit(args);
      const owner = getOwnerFromRemoteUrl(remoteUrl);
      if (owner) return owner;
    } catch {
      /* try next */
    }
  }
  throw new Error('Unable to determine repository owner from git remote.origin.url');
}

/**
 * Determine the repository name from the local git remote.
 * Tries multiple git command variants.
 * @returns {Promise<string>}
 */
async function getCurrentRepo() {
  const commands = [
    ['config', '--local', '--get', 'remote.origin.url'],
    ['remote', 'get-url', 'origin']
  ];
  for (const args of commands) {
    try {
      const remoteUrl = await runGit(args);
      const repo = getRepoFromRemoteUrl(remoteUrl);
      if (repo) return repo;
    } catch {
      /* try next */
    }
  }
  throw new Error('Unable to determine repository name from git remote.origin.url');
}

/**
 * Get both owner and repo from the local git remote.
 * @returns {Promise<{owner: string, repo: string}>}
 */
async function getOwnerRepo() {
  const owner = await getCurrentOwner();
  const repo = await getCurrentRepo();
  return { owner, repo };
}

// ─── Workflow API ────────────────────────────────────────────

/**
 * Get the latest workflow run for a repository.
 * When workflowId is provided, filters by that specific workflow (filename or ID).
 * @param {string} owner - GitHub repository owner
 * @param {string} repo - GitHub repository name
 * @param {string} [workflowId] - Workflow filename (e.g. "test.yml") or numeric ID
 * @returns {Promise<object|undefined>} The latest workflow run object
 */
async function getLatestRun(owner, repo, workflowId) {
  let url;
  if (workflowId) {
    url = `${BASE}/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowId)}/runs?per_page=1`;
  } else {
    url = `${BASE}/repos/${owner}/${repo}/actions/runs?per_page=1`;
  }
  const data = await request(url);
  return data.workflow_runs?.[0];
}

/**
 * Get all jobs for a specific workflow run.
 * @param {string} owner - GitHub repository owner
 * @param {string} repo - GitHub repository name
 * @param {number|string} runId - Workflow run ID
 * @returns {Promise<object[]>} Array of job objects
 */
async function getJobs(owner, repo, runId) {
  const data = await request(`${BASE}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`);
  return data.jobs || [];
}

module.exports = {
  BASE,
  HEADERS,
  request,
  runGit,
  parseOwnerFromUrl,
  getOwnerFromRemoteUrl,
  getRepoFromRemoteUrl,
  getCurrentOwner,
  getCurrentRepo,
  getOwnerRepo,
  getLatestRun,
  getJobs
};
