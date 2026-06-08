/**
 * 📦 GitHub Package Resolver
 *
 * This script updates the commit hashes in `package.json`'s `resolutions` field
 * for GitHub tarball URLs (typically using `raw/branch-name/...`) to point to the
 * latest commit SHA of the corresponding repository and branch.
 *
 * 🔍 Features:
 * - Parses GitHub URLs to extract repository owner, name, and branch.
 * - Fetches the latest commit SHA across all branches using GitHub's API.
 * - Replaces the old branch or commit in the URL with the latest SHA.
 * - Overwrites `package.json` with the updated URLs.
 *
 * 🛠 Requirements:
 * - GitHub Personal Access Token (GITHUB_TOKEN) via `.env`
 * - ESM support (`type: "module"` in `package.json`)
 * - Node.js v18+ recommended for ESM and `fetch` fallback compatibility
 *
 * 🧩 Dependencies:
 * - `ansi-colors` – for styled terminal output
 *
 * ✅ Use case:
 * - Ensures package resolutions always use immutable SHAs instead of mutable branch names.
 * - Helps achieve deterministic builds in monorepos or projects with internal GitHub packages.
 */

import fs from 'fs';
import { parseGitHubUrl } from 'git-command-helper';
import os from 'os';
import path from 'upath';
import { getGithubToken } from './binary-collections/config.cjs';
import fetchResponse from './utils/fetchResponse.cjs';
import * as utils from './utils/index.cjs';

// Show help if --help/-h is passed
const args = utils.getArgs();
if (args.help || args.h) {
  showHelp();
}

/**
 * Display help information for the package-resolutions-updater script.
 */
function showHelp() {
  const helpText = `\n\
GitHub Package Resolutions Updater\n\
Usage:\n  node src/package-resolutions-updater.mjs [options]\n\
Options:\n  --help, -h           Show this help message\n\
Description:\n  Updates the commit hashes in package.json's 'resolutions' field for GitHub tarball URLs to point to the latest commit SHA of the corresponding repository and branch.\n\
Features:\n  - Parses GitHub URLs to extract repository owner, name, and branch.\n  - Fetches the latest commit SHA across all branches using GitHub's API.\n  - Replaces the old branch or commit in the URL with the latest SHA.\n  - Overwrites package.json with the updated URLs.\n\
Requirements:\n  - GitHub Personal Access Token (GITHUB_TOKEN) via .env\n  - ESM support (type: "module" in package.json)\n  - Node.js v18+ recommended\n\
Dependencies:\n  - ansi-colors – for styled terminal output\n\
Examples:\n  node src/package-resolutions-updater.mjs\n  node src/package-resolutions-updater.mjs --help\n\n`;
  console.log(helpText);
  process.exit(0);
}

// --- Use a random User-Agent for GitHub API requests ---
const GITHUB_USER_AGENTS = [
  'octokit-rest.js/19.0.7',
  'GitHub CLI/2.40.0',
  'Mozilla/5.0 (compatible; GitHubCopilot/1.0)',
  'PostmanRuntime/7.32.3',
  'binary-collections-resolver/1.0 (+https://github.com/dimaslanjaka/bin)'
];

// --- User-Agent persistence in system temp folder ---
const userAgentDir = path.join(os.tmpdir(), 'nodejs');
const userAgentFile = path.join(userAgentDir, 'useragent.txt');
let selectedUserAgent;
try {
  if (!fs.existsSync(userAgentDir)) fs.mkdirSync(userAgentDir, { recursive: true });
  if (fs.existsSync(userAgentFile)) {
    const fileAgent = fs.readFileSync(userAgentFile, 'utf-8').trim();
    if (GITHUB_USER_AGENTS.includes(fileAgent)) {
      selectedUserAgent = fileAgent;
    }
  }
  if (!selectedUserAgent) {
    selectedUserAgent = GITHUB_USER_AGENTS[Math.floor(Math.random() * GITHUB_USER_AGENTS.length)];
    fs.writeFileSync(userAgentFile, selectedUserAgent, 'utf-8');
  }
} catch (_e) {
  // fallback to random if any error
  selectedUserAgent = GITHUB_USER_AGENTS[Math.floor(Math.random() * GITHUB_USER_AGENTS.length)];
}

/**
 * Fetch JSON from a URL with GitHub headers.
 * @param {string} url
 * @returns {Promise<any>}
 */
export async function fetchJson(url) {
  const token = getGithubToken();
  const response = await fetchResponse(url, {
    headers: {
      'User-Agent': selectedUserAgent,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `token ${token}` } : {})
    },
    responseType: 'json'
  });

  if (response.status < 200 || response.status >= 300) {
    const message = response.data?.message || 'Unknown error';
    throw new Error(`GitHub API Error ${response.status}: ${message}\nURL: ${url}`);
  }

  return response.data;
}

/**
 * Get latest commit SHA from a specific branch.
 */
export async function getLatestCommit(owner, repo, branch = 'main') {
  const url = `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`;
  const json = await fetchJson(url);

  const sha = json.sha;
  const dateStr = json.commit?.committer?.date || json.commit?.author?.date;

  if (!sha || !dateStr) {
    console.log(json);
    throw new Error(`Missing SHA or date for ${owner}/${repo}@${branch}`);
  }

  return {
    owner,
    repo,
    branch,
    sha,
    date: new Date(dateStr).toISOString()
  };
}

/**
 * Get latest commit SHA from all branches and pick the latest.
 */
export async function getLatestCommitAcrossBranches(owner, repo) {
  const branches = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/branches`);

  const commits = await Promise.all(
    branches.map(async ({ name, commit }) => {
      const commitSha = commit?.sha;
      if (!commitSha) {
        console.warn(`No commit SHA for '${owner}/${repo}' branch: ${name}`);
        return { branch: name, sha: '', date: new Date(0) };
      }

      try {
        const commitData = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/commits/${commitSha}`);
        const dateStr = commitData.commit?.committer?.date || commitData.commit?.author?.date;
        const date = dateStr ? new Date(dateStr) : new Date(0);
        return { branch: name, sha: commitData.sha, date };
      } catch (e) {
        console.warn(`Failed to fetch commit for ${name}: ${e.message}`);
        return { branch: name, sha: commitSha, date: new Date(0) };
      }
    })
  );

  const latest = commits.reduce((a, b) => (a.date > b.date ? a : b), { date: new Date(0) });

  return {
    owner,
    repo,
    branch: latest.branch,
    sha: latest.sha,
    date: latest.date.toISOString()
  };
}

/**
 * Replace the branch or commit in a GitHub raw URL with the latest hash.
 */
export function replaceRawWithLatestHash(url, latestHash) {
  const parsed = parseGitHubUrl(url);

  if (!parsed || !parsed.owner || !parsed.repo || !parsed.branch) {
    throw new Error('Invalid GitHub raw URL');
  }

  const branchPrefix = `${parsed.branch}/`;
  const rawPrefix = parsed.host === 'github.com' ? `raw/${branchPrefix}` : branchPrefix;
  const refsPrefix = `refs/heads/${branchPrefix}`;
  const path = parsed.path.startsWith(rawPrefix)
    ? parsed.path.slice(rawPrefix.length)
    : parsed.path.startsWith(refsPrefix)
      ? parsed.path.slice(refsPrefix.length)
      : parsed.path.startsWith(branchPrefix)
        ? parsed.path.slice(branchPrefix.length)
        : parsed.path;

  if (parsed.host === 'github.com') {
    return `https://github.com/${parsed.owner}/${parsed.repo}/raw/${latestHash}/${path}`;
  }

  if (parsed.host === 'raw.githubusercontent.com') {
    return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${latestHash}/${path}`;
  }

  throw new Error('Invalid GitHub raw URL');
}

// Re-export parseGitHubUrl from git-command-helper for backward compatibility
export { parseGitHubUrl };

/**
 * Resolve all package resolution updates.
 * Pure logic function for Jest testing.
 */
export async function resolvePackageResolutionUpdates(resolutions, specialPackageOverrides = []) {
  const updates = [];

  for (const [currentPkgName, version] of Object.entries(resolutions || {})) {
    // Check if the version is a URL; skip semver strings like ^x.y.z, ~x.y.z, x.y.z
    const isUrl = typeof version === 'string' && (version.startsWith('http://') || version.startsWith('https://'));
    if (!isUrl) {
      updates.push({
        skipped: true,
        currentPkgName,
        url: version,
        error: new Error('Version is not a URL, skipping')
      });
      continue;
    }

    // Validate if URL is a GitHub URL
    let repo;

    try {
      repo = parseGitHubUrl(version);
    } catch (error) {
      updates.push({
        skipped: true,
        currentPkgName,
        url: version,
        error
      });

      continue;
    }

    try {
      const override = specialPackageOverrides.find((p) => p.pkg === currentPkgName);

      const latest = override
        ? await getLatestCommit(override.owner, override.repo, override.branch)
        : await getLatestCommitAcrossBranches(repo.owner, repo.repo);

      const new_url = replaceRawWithLatestHash(version, latest.sha);

      // verify the new URL is can be accessed
      const response = await fetchResponse(new_url);

      if (response.status < 200 || response.status >= 300) {
        updates.push({
          failed: true,
          currentPkgName,
          url: version,
          new_url,
          repo,
          latest,
          error: new Error(`New URL not accessible (status ${response.status}).\noriginal: ${version}\nnew: ${new_url}`)
        });
        continue;
      }

      updates.push({
        currentPkgName,
        url: version,
        new_url,
        repo,
        latest
      });
    } catch (error) {
      updates.push({
        failed: true,
        currentPkgName,
        url: version,
        repo,
        error
      });
    }
  }

  return updates;
}
