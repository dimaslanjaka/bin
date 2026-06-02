#!/usr/bin/env node

/**
 * CLI to generate a detailed SVG badge for the latest GitHub Actions workflow.
 *
 * Usage:
 *   workflow-badge [options]
 *   workflow-badge --output badge.svg
 *   workflow-badge --owner dimaslanjaka --repo bin
 *
 * Aliases:
 *   workflow-badge, wf-badge, gh-status-badge, actions-badge
 */

import fs from 'fs';
import path from 'upath';
import axios from 'axios';
import { spawn } from 'cross-spawn';
import { getArgs } from './utils/index.cjs';
import { generateBadge } from './workflow-badge/generator.mjs';
import { GITHUB_ACCESS_TOKEN as TOKEN } from './binary-collections/config.cjs';

// ─── Auth ───────────────────────────────────────────────────────────
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

// ─── GitHub API helpers ─────────────────────────────────────────
async function api(url) {
  const res = await axios.get(url, { headers: HEADERS });
  return res.data;
}

async function runGit(args) {
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

function parseOwner(remoteUrl) {
  const m = remoteUrl
    .trim()
    .replace(/\.git$/i, '')
    .match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/]+)$/i);
  return m?.groups || null;
}

async function getOwnerRepo() {
  for (const args of [
    ['config', '--local', '--get', 'remote.origin.url'],
    ['remote', 'get-url', 'origin']
  ]) {
    try {
      const url = await runGit(args);
      const parsed = parseOwner(url);
      if (parsed) return parsed;
    } catch {
      /* try next */
    }
  }
  throw new Error('Unable to determine owner/repo from git remote.origin.url');
}

async function getLatestRun(owner, repo) {
  const data = await api(`${BASE}/repos/${owner}/${repo}/actions/runs?per_page=1`);
  return data.workflow_runs?.[0];
}

async function getJobs(owner, repo, runId) {
  const data = await api(`${BASE}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`);
  return data.jobs || [];
}

// ─── CLI ────────────────────────────────────────────────────────────

const HELP = `
Usage: workflow-badge [options]

Generate a detailed SVG badge for the latest GitHub Actions workflow status.

Options:
  -o, --output <file>   Write SVG to file instead of stdout
  --owner <owner>       GitHub repository owner (default: auto-detect from git)
  --repo <repo>         GitHub repository name (default: auto-detect from git)
  --width <px>          SVG width in pixels (default: 520)
  --max-steps <n>       Max steps to show per job (default: all)
  -h, --help            Show this help message

Examples:
  workflow-badge
  workflow-badge --output badge.svg
  workflow-badge --owner dimaslanjaka --repo bin --width 600
`;

async function main() {
  const argv = getArgs({
    string: ['output', 'owner', 'repo', 'width', 'max-steps'],
    boolean: ['help'],
    alias: { o: 'output', h: 'help', w: 'width' }
  });

  if (argv.help) {
    console.log(HELP);
    process.exit(0);
  }

  const owner = argv.owner || process.env.GH_OWNER;
  const repo = argv.repo || process.env.GH_REPO;

  if (owner && repo) {
    console.error(`[workflow-badge] Using owner=${owner} repo=${repo}`);
  } else {
    const parsed = await getOwnerRepo();
    if (!owner) argv.owner = parsed.owner;
    if (!repo) argv.repo = parsed.repo;
    console.error(`[workflow-badge] Detected ${parsed.owner}/${parsed.repo} from git remote`);
  }

  const finalOwner = argv.owner || owner;
  const finalRepo = argv.repo || repo;

  console.error(`[workflow-badge] Fetching latest workflow for ${finalOwner}/${finalRepo} ...`);

  const run = await getLatestRun(finalOwner, finalRepo);
  if (!run) {
    console.error('[workflow-badge] No workflow runs found.');
    process.exit(1);
  }

  const jobs = await getJobs(finalOwner, finalRepo, run.id);
  console.error(
    `[workflow-badge] Run #${run.id}: ${run.status}${run.conclusion ? ` (${run.conclusion})` : ''} \u2014 ${jobs.length} job(s)`
  );

  const maxSteps = argv['max-steps'] ? parseInt(argv['max-steps'], 10) : undefined;
  const options = { width: parseInt(argv.width, 10) || 520 };
  if (maxSteps !== undefined) options.maxSteps = maxSteps;

  const svg = generateBadge(run, jobs, options);

  if (argv.output) {
    const outPath = path.resolve(argv.output);
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(outPath, svg, 'utf-8');
    console.error(`[workflow-badge] Badge written to ${outPath}`);
  } else {
    process.stdout.write(svg);
  }
}

main().catch((err) => {
  console.error('[workflow-badge] Error:', err.message);
  process.exit(1);
});
