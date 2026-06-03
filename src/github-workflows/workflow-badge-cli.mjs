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
import { getArgs } from '../utils/index.cjs';
import { generateBadge } from './workflow-badge-generator.mjs';
import { getLatestRun, getJobs, getOwnerRepo } from './utils.cjs';

// ─── CLI ────────────────────────────────────────────────────────────

const HELP = `
Usage: workflow-badge [options]

Generate a detailed SVG badge for the latest GitHub Actions workflow status.

Options:
  -o, --output <file>   Write SVG to file instead of stdout
  --owner <owner>       GitHub repository owner (default: auto-detect from git)
  --repo <repo>         GitHub repository name (default: auto-detect from git)
  --workflow <name>     Filter by workflow filename (e.g. "test.yml") or workflow ID
  --token <token>       GitHub access token (overrides env: ACCESS_TOKEN, GITHUB_TOKEN, GH_TOKEN)
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
    string: ['output', 'owner', 'repo', 'workflow', 'width', 'max-steps'],
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
  const workflowId = argv.workflow;

  const target = workflowId ? `${finalOwner}/${finalRepo} (workflow: ${workflowId})` : `${finalOwner}/${finalRepo}`;
  console.error(`[workflow-badge] Fetching latest workflow for ${target} ...`);

  const run = await getLatestRun(finalOwner, finalRepo, workflowId);
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
