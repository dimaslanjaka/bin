#!/usr/bin/env node

const { spawnSync } = require('child_process');
const color = require('ansi-colors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env using dotenv from process.cwd()
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: true, quiet: true });

const { getArgs } = require('./utils/index.cjs');
const args = getArgs();
const positional = args._ || [];

// Print help message if --help or -h is present
if (args.help || args.h) {
  console.log();
  console.log('Usage: submodule-install [options] [repo-path]');
  console.log();
  console.log('Options:');
  console.log('  --cwd <path>      Set working directory');
  console.log('  --help, -h        Show this help message');
  console.log();
  console.log('Description:');
  console.log('  Installs and updates git submodules recursively, applying access tokens for private repos.');
  console.log();
  process.exit(0);
}

const ACCESS_TOKEN = process.env.GITHUB_TOKEN || process.env.ACCESS_TOKEN;

let ROOT = runGit(['rev-parse', '--show-toplevel']).trim();
let REPO_PATH = ROOT;

if (args.cwd) {
  ROOT = path.resolve(args.cwd);
} else if (positional.length > 0) {
  ROOT = path.resolve(positional[0]);
}

// Track visited submodules by absolute path to prevent infinite recursion
const CURRENT_PATH = ROOT;

// Prevent recursion loops
const VISITED_SUBMODULES = (process.env.VISITED_SUBMODULES || '').split(path.delimiter).filter(Boolean);

if (VISITED_SUBMODULES.includes(CURRENT_PATH)) {
  console.log(`Skipping ${CURRENT_PATH} (already processed) to avoid recursion.`);
  process.exit(0);
}

VISITED_SUBMODULES.push(CURRENT_PATH);
process.env.VISITED_SUBMODULES = VISITED_SUBMODULES.join(path.delimiter);

console.log(`Installing submodules at ${ROOT}`);

// -------------------------------
// SAFE .gitmodules CHECK (ROOT)
// -------------------------------
const ROOT_GITMODULES = path.join(REPO_PATH, '.gitmodules');

if (!fs.existsSync(ROOT_GITMODULES) || fs.statSync(ROOT_GITMODULES).size === 0) {
  console.log(`No valid .gitmodules found at ${ROOT_GITMODULES}. Skipping submodule processing.`);
  process.exit(0);
}

// -------------------------------
// SAFE git config read
// -------------------------------
let submoduleList = [];
try {
  const output = runGit(['-C', REPO_PATH, 'config', '-f', '.gitmodules', '--get-regexp', '^submodule\\..*\\.path$']);

  submoduleList = output.split('\n').filter(Boolean);
} catch (err) {
  console.log('No submodules found or .gitmodules invalid. Skipping.', err);
  process.exit(0);
}

// -------------------------------
// PROCESS SUBMODULES
// -------------------------------
for (const line of submoduleList) {
  const [KEY, MODULE_PATH] = line.trim().split(/\s+/);
  const RELATIVE_MODULE_PATH = path.join(ROOT, MODULE_PATH);

  if (fs.existsSync(RELATIVE_MODULE_PATH)) {
    console.log(`Deleting ${RELATIVE_MODULE_PATH}`);
    fs.rmSync(RELATIVE_MODULE_PATH, { recursive: true, force: true });
  }

  const NAME = KEY.match(/^submodule\.(.*)\.path$/)[1];

  const URL = runGit(['-C', REPO_PATH, 'config', '-f', '.gitmodules', '--get', `submodule.${NAME}.url`]).trim();

  let BRANCH;
  try {
    BRANCH = runGit(['-C', REPO_PATH, 'config', '-f', '.gitmodules', '--get', `submodule.${NAME}.branch`]).trim();
    if (!BRANCH) BRANCH = 'master';
  } catch (err) {
    console.log(`Error occurred while fetching branch for submodule ${NAME}:`, err);
    BRANCH = 'master';
  }

  console.log(`Submodule: ${color.cyan(NAME)}`);
  console.log(`  Location: ${color.magenta(MODULE_PATH)}`);
  console.log(`  ROOT: ${color.yellow(ROOT)}`);
  console.log(`  URL: ${color.blue(URL)}`);
  console.log(`  Branch: ${color.green(BRANCH)}`);

  const addResult = runGit(
    ['-C', REPO_PATH, 'submodule', 'add', '--force', '-b', BRANCH, '--name', NAME, URL, MODULE_PATH],
    true
  );

  if (addResult.status !== 0) {
    console.warn(`Cannot add submodule ${MODULE_PATH}`);
    continue;
  }

  if (!fs.existsSync(RELATIVE_MODULE_PATH)) {
    console.warn(`Submodule directory missing. Attempting manual clone...`);
    try {
      runGit(['clone', '--branch', BRANCH, URL, RELATIVE_MODULE_PATH]);
    } catch (e) {
      console.error(`Manual clone failed: ${e.message}`);
      continue;
    }

    if (!fs.existsSync(RELATIVE_MODULE_PATH)) {
      console.error(`Still missing after clone: ${RELATIVE_MODULE_PATH}`);
      continue;
    }
  }

  const GIT_MODULES = path.join(RELATIVE_MODULE_PATH, '.gitmodules');

  if (!fs.existsSync(GIT_MODULES)) {
    console.log(`No .gitmodules in ${RELATIVE_MODULE_PATH}. Skipping nested processing.`);
    continue;
  }

  if (fs.statSync(GIT_MODULES).size === 0) {
    console.log(`Empty .gitmodules in ${RELATIVE_MODULE_PATH}. Skipping nested processing.`);
    continue;
  }

  if (ACCESS_TOKEN) {
    let URL_WITH_TOKEN;
    let repoInfo;

    if (URL.includes('github.com')) {
      repoInfo = URL.replace('https://github.com/', '');
      URL_WITH_TOKEN = `https://${ACCESS_TOKEN}@github.com/${repoInfo}`;
    } else if (URL.includes('gitlab.com') && typeof process.env.GITLAB_TOKEN === 'string') {
      repoInfo = URL.replace('https://gitlab.com/', '');
      URL_WITH_TOKEN = `https://oauth2:${ACCESS_TOKEN}@gitlab.com/${repoInfo}`;
    } else {
      const urlObj = new URL(URL);
      repoInfo = urlObj.pathname.substring(1);
      URL_WITH_TOKEN = `${urlObj.protocol}//${ACCESS_TOKEN}@${urlObj.host}${urlObj.pathname}`;
    }

    if (URL_WITH_TOKEN) {
      console.log(`Apply token for ${repoInfo} at ${MODULE_PATH}`);
      runGit(['-C', RELATIVE_MODULE_PATH, 'remote', 'set-url', 'origin', URL_WITH_TOKEN]);
    }
  }

  runGit(['-C', RELATIVE_MODULE_PATH, 'fetch', '--all']);
  runGit(['-C', RELATIVE_MODULE_PATH, 'pull', 'origin', BRANCH, '-X', 'theirs']);

  // recursive submodule handling
  console.log(`${MODULE_PATH} has submodules`);
  const env = Object.assign({}, process.env, {
    VISITED_SUBMODULES: process.env.VISITED_SUBMODULES + path.delimiter + path.resolve(RELATIVE_MODULE_PATH)
  });

  const result = spawnSync('node', [__filename, '-cwd', RELATIVE_MODULE_PATH], {
    stdio: 'inherit',
    env,
    cwd: RELATIVE_MODULE_PATH
  });

  if (result.status !== 0) {
    console.error(`Recursive submodule failed for ${RELATIVE_MODULE_PATH}`);
    process.exit(result.status);
  }
}

// final sync
runGit(['-C', REPO_PATH, 'submodule', 'update', '--init', '--recursive']);

// ---------------------------
// Helper
// ---------------------------
function runGit(args, returnResult = false) {
  console.log(`Executing: git ${args.join(' ')}`);

  const result = spawnSync('git', args, { encoding: 'utf-8' });

  if (returnResult) return result;

  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  }

  return result.stdout || '';
}
