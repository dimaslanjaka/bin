import axios from 'axios';
import { spawn } from 'cross-spawn';
import { GITHUB_ACCESS_TOKEN as TOKEN } from '../binary-collections/config.cjs';

if (!TOKEN) {
  console.error('Missing env var: ACCESS_TOKEN or GITHUB_TOKEN');
  process.exit(1);
}

const BASE = 'https://api.github.com';

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
};

async function request(url) {
  try {
    const res = await axios.get(url, { headers });
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
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(stderr.trim() || `git ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function getOwnerFromRemoteUrl(remoteUrl) {
  const normalized = remoteUrl.trim().replace(/\.git$/i, '');
  const match = normalized.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/]+)$/i);

  return match?.groups?.owner || null;
}

function getRepoFromRemoteUrl(remoteUrl) {
  const normalized = remoteUrl.trim().replace(/\.git$/i, '');
  const match = normalized.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/]+)$/i);

  return match?.groups?.repo || null;
}

async function getCurrentOwner() {
  const commands = [
    ['config', '--local', '--get', 'remote.origin.url'],
    ['remote', 'get-url', 'origin']
  ];

  for (const args of commands) {
    try {
      const remoteUrl = await runGit(args);
      const owner = getOwnerFromRemoteUrl(remoteUrl);

      if (owner) {
        return owner;
      }
    } catch {
      // Try the next git source.
    }
  }

  throw new Error('Unable to determine repository owner from git remote.origin.url');
}

async function getCurrentRepo() {
  const commands = [
    ['config', '--local', '--get', 'remote.origin.url'],
    ['remote', 'get-url', 'origin']
  ];

  for (const args of commands) {
    try {
      const remoteUrl = await runGit(args);
      const repo = getRepoFromRemoteUrl(remoteUrl);

      if (repo) {
        return repo;
      }
    } catch {
      // Try the next git source.
    }
  }

  throw new Error('Unable to determine repository name from git remote.origin.url');
}

// 1. Get latest workflow run
// workflowId can be a workflow filename (e.g. "test.yml") or numeric workflow ID
async function getLatestRun(owner, repo, workflowId) {
  let url = `${BASE}/repos/${owner}/${repo}/actions/runs?per_page=1`;
  if (workflowId) {
    url += `&workflow_id=${encodeURIComponent(workflowId)}`;
  }
  const data = await request(url);
  return data.workflow_runs?.[0];
}

// 2. Get jobs for run
async function getJobs(owner, repo, runId) {
  const url = `${BASE}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`;
  const data = await request(url);
  return data.jobs || [];
}

// 3. Format output
function printReport(run, jobs) {
  console.log('\n==============================');
  console.log('🚀 Latest Workflow Run');
  console.log('==============================');
  console.log(`Name      : ${run.name}`);
  console.log(`Status    : ${run.status}`);
  console.log(`Conclusion: ${run.conclusion}`);
  console.log(`Branch    : ${run.head_branch}`);
  console.log(`Run ID    : ${run.id}`);
  console.log(`URL       : ${run.html_url}`);

  console.log('\n==============================');
  console.log('🧩 Jobs & Steps');
  console.log('==============================\n');

  for (const job of jobs) {
    console.log(`🧱 Job: ${job.name}`);
    console.log(`   Status: ${job.status} | Conclusion: ${job.conclusion}`);

    if (!job.steps?.length) {
      console.log('   (no steps found)\n');
      continue;
    }

    for (const step of job.steps) {
      const icon =
        step.conclusion === 'success'
          ? '✅'
          : step.conclusion === 'failure'
            ? '❌'
            : step.conclusion === 'skipped'
              ? '⏭️'
              : '⚪';

      console.log(`   ${icon} ${step.name} -> ${step.conclusion} (${step.status})`);
    }

    console.log('');
  }
}

export {
  request,
  getLatestRun,
  getJobs,
  getCurrentOwner,
  getCurrentRepo,
  getOwnerFromRemoteUrl,
  getRepoFromRemoteUrl,
  printReport
};
