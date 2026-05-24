#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const fs = require('fs-extra');
const minimist = require('minimist');

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: 'pipe',
      ...opts
    }).trim();
  } catch (err) {
    console.error(err.stderr?.toString() || err.message);
    process.exit(err.status || 1);
  }
}

function getBranchName() {
  return run('git rev-parse --abbrev-ref HEAD');
}

function safeBranchName(name) {
  return name.replace(/[\\/]/g, '-');
}

function findYarn() {
  try {
    const paths = run(process.platform === 'win32' ? 'where yarn' : 'which yarn')
      .split(/\r?\n/)
      .filter(Boolean);

    if (process.platform === 'win32') {
      return paths.find((p) => /\.cmd$/i.test(p)) || paths[0] || null;
    }

    return paths[0] || null;
  } catch {
    return null;
  }
}

function runYarn(yarnPath, args) {
  const result =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', yarnPath, ...args], {
          stdio: 'inherit'
        })
      : spawnSync(yarnPath, args, {
          stdio: 'inherit'
        });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exitCode = result.status || 0;
}

function showHelp() {
  console.log(`
Usage:
  yarn-lock-sync [packages...]

Options:
  -h, --help    Show help

Examples:
  yarn-lock-sync
  yarn-lock-sync lodash axios
`);
}

function main() {
  const argv = minimist(process.argv.slice(2), {
    boolean: ['help'],
    alias: {
      h: 'help'
    }
  });

  if (argv.help) {
    showHelp();
    return;
  }

  const packages = argv._;

  const branch = safeBranchName(getBranchName());

  const yarnLock = 'yarn.lock';
  const branchLock = `yarn.${branch}.lock`;

  const yarnPath = findYarn();

  if (!yarnPath) {
    console.error('Error: Yarn not found in PATH.');
    process.exit(1);
  }

  // Restore branch-specific lockfile
  if (fs.existsSync(branchLock)) {
    console.log(`Restoring ${branchLock} -> ${yarnLock}`);
    fs.copyFileSync(branchLock, yarnLock);
  } else {
    console.log(`No ${branchLock} found`);

    // remove stale lockfile
    fs.removeSync(yarnLock);
  }

  // Run yarn
  const args = packages.length ? ['up', ...packages] : ['install'];

  console.log(`Running: yarn ${args.join(' ')}`);

  runYarn(yarnPath, args);

  // Save updated lockfile
  if (fs.existsSync(yarnLock)) {
    console.log(`Saving ${yarnLock} -> ${branchLock}`);
    fs.copyFileSync(yarnLock, branchLock);
  }
}

main();
