import 'dotenv/config';
import minimist from 'minimist';
import { Octokit } from '@octokit/rest';
import { spawnSync } from 'node:child_process';

const argv = minimist(process.argv.slice(2), {
  string: ['repo', 'token'],
  boolean: ['dry-run', 'help'],
  alias: {
    r: 'repo',
    t: 'token',
    h: 'help'
  },
  default: {
    'dry-run': true
  }
});

function usage() {
  console.log(`
Usage:
  node del-log.mjs [options]

Options:
  --repo, -r       GitHub repository (owner/repo), optional
  --token, -t      Override token from environment
  --dry-run        Preview only (default: true)
  --dry-run=false  Delete failed workflow runs permanently
  --help, -h       Show help

Environment:
  ACCESS_TOKEN     Preferred token from .env
  GITHUB_TOKEN     Fallback token

Examples:
  node del-log.mjs
  node del-log.mjs --repo=dimaslanjaka/hexo-cli
  node del-log.mjs --dry-run=false
  node del-log.mjs --repo=dimaslanjaka/hexo-cli --dry-run=false
`);
}

function getGitRemote() {
  const result = spawnSync('git', ['remote', 'get-url', 'origin'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    windowsHide: true
  });

  if (result.error) {
    throw new Error(`Failed to execute git: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || 'Unable to get Git origin remote.');
  }

  const remote = result.stdout.trim();

  if (!remote) {
    throw new Error('Git origin remote is empty.');
  }

  return remote;
}

function parseGitHubRepo(value) {
  const input = value.trim();

  if (/^[^/:\s]+\/[^/:\s]+$/.test(input)) {
    return input.replace(/\.git$/i, '');
  }

  const match = input.match(/^(?:https?:\/\/|ssh:\/\/git@|git:\/\/)?github\.com[:/]([^/]+)\/([^/?#]+?)(?:\.git)?\/?$/i);

  if (!match) {
    throw new Error(`Invalid GitHub repository or remote URL: ${input}`);
  }

  return `${match[1]}/${match[2]}`;
}

function resolveRepo() {
  const explicitRepo = (argv.repo || '').trim();

  if (explicitRepo) {
    return parseGitHubRepo(explicitRepo);
  }

  console.log('No --repo provided; detecting Git origin...');

  const remote = getGitRemote();
  const detectedRepo = parseGitHubRepo(remote);

  console.log(`Detected remote: ${remote}`);
  console.log(`Detected repository: ${detectedRepo}\n`);

  return detectedRepo;
}

if (argv.help) {
  usage();
  process.exit(0);
}

let fullRepo;

try {
  fullRepo = resolveRepo();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

const [owner, repo] = fullRepo.split('/');

const token = argv.token || process.env.ACCESS_TOKEN || process.env.GITHUB_TOKEN;

const DRY_RUN = argv['dry-run'];

if (!token) {
  console.error('Error: Missing GitHub token.');
  console.error('Set ACCESS_TOKEN or GITHUB_TOKEN in .env, or use --token.');
  process.exit(1);
}

const octokit = new Octokit({ auth: token });

async function main() {
  let page = 1;
  let scanned = 0;
  let deleted = 0;
  let failed = 0;

  console.log(`Repository: ${fullRepo}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'DELETE WORKFLOW RUNS'}\n`);

  while (true) {
    const { data } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      status: 'completed',
      per_page: 100,
      page
    });

    const runs = data.workflow_runs;

    if (runs.length === 0) break;

    // Keep only failed runs before processing.
    const failedRuns = runs.filter((run) => run.conclusion === 'failure');

    for (const run of failedRuns) {
      scanned++;

      console.log(`[${DRY_RUN ? 'DRY RUN' : 'DELETE'}] ` + `#${run.id} ${run.name || 'Unnamed workflow'} (failure)`);

      if (DRY_RUN) continue;

      try {
        const response = await octokit.actions.deleteWorkflowRun({
          owner,
          repo,
          run_id: run.id
        });

        if (response.status === 204) {
          deleted++;
          console.log(`  ✓ Workflow run deleted: ${run.id}`);
        } else {
          failed++;
          console.error(`  ✗ Run ${run.id}: unexpected HTTP ${response.status}`);
        }
      } catch (error) {
        failed++;
        console.error(`  ✗ Run ${run.id}: ${error.message}`);

        if (error.status) {
          console.error(`    HTTP status: ${error.status}`);
        }
      }
    }

    if (runs.length < 100) break;

    page++;
  }

  console.log('\nFinished.');
  console.log(`Repository: ${fullRepo}`);
  console.log(`Failed runs found: ${scanned}`);

  if (DRY_RUN) {
    console.log('No workflow runs were deleted.');
    console.log('Use --dry-run=false to permanently delete them.');
  } else {
    console.log(`Workflow runs deleted: ${deleted}`);
    console.log(`Errors: ${failed}`);
  }
}

main().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exitCode = 1;
});
