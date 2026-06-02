#!/usr/bin/env node

/**
 * Standalone CLI for get-latest-workflow-status.
 *
 * Prints the latest GitHub Actions workflow run and its job/step breakdown
 * to the terminal.
 *
 * Usage:
 *   node src/github-workflows/get-latest-workflow-status-cli.mjs
 *   node src/github-workflows/get-latest-workflow-status-cli.mjs --help
 */

import { getArgs } from '../utils/index.cjs';
import { getLatestRun, getJobs, getCurrentOwner, getCurrentRepo, printReport } from './get-latest-workflow-status.mjs';

const HELP = `
Usage: get-latest-workflow-status [options]

Print the latest GitHub Actions workflow run with its jobs and steps.

Options:
  --owner <owner>       GitHub repository owner (default: auto-detect from git)
  --repo <repo>         GitHub repository name (default: auto-detect from git)
  --workflow <name>     Filter by workflow filename (e.g. "test.yml") or workflow ID
  --token <token>       GitHub access token (overrides env: ACCESS_TOKEN, GITHUB_TOKEN, GH_TOKEN)
  -h, --help            Show this help message
`;

async function main() {
  const argv = getArgs({
    string: ['owner', 'repo', 'workflow'],
    boolean: ['help'],
    alias: { h: 'help' }
  });

  if (argv.help) {
    console.log(HELP);
    process.exit(0);
  }

  try {
    const owner = argv.owner || process.env.GH_OWNER || (await getCurrentOwner());
    const repo = argv.repo || process.env.GH_REPO || (await getCurrentRepo());
    const workflowId = argv.workflow;
    const run = await getLatestRun(owner, repo, workflowId);

    if (!run) {
      console.log('No workflow runs found.');
      return;
    }

    const jobs = await getJobs(owner, repo, run.id);
    printReport(run, jobs);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
