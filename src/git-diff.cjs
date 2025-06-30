#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Output path
const CACHE_DIR = '.cache/git';
const OUTPUT = path.join(CACHE_DIR, 'diff.txt');

// Ensure output directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function showHelp() {
  console.log('Git Diff Helper');
  console.log('----------------------------');
  console.log('Usage:');
  console.log('  git-diff FILE             Show staged diff of specified file');
  console.log('  git-diff --staged-only    Show staged diff of all files');
  console.log('  git-diff -s | -S          Same as --staged-only');
  console.log('  git-diff --help | -h      Show this help message');
  console.log('');
  console.log(`Output is saved to: ${OUTPUT}`);
  process.exit(0);
}

function runGitDiff(command, successMessage, errorMessage) {
  try {
    const result = execSync(command, { encoding: 'utf8' });
    fs.writeFileSync(OUTPUT, result);
    console.log(`[✓] ${successMessage}`);
  } catch (_error) {
    console.error(`[✗] ${errorMessage}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

// Show help if no arguments or --help/-h is passed
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  showHelp();
}

// Parse options
switch (args[0]) {
  case '--staged-only':
  case '-s':
  case '-S':
    runGitDiff('git --no-pager diff --staged', `Full staged diff saved to "${OUTPUT}"`, 'Failed to save staged diff');
    break;

  default: {
    // Handle specific file diff
    const file = args[0];
    runGitDiff(
      `git --no-pager diff --cached -- "${file}"`,
      `Staged diff of "${file}" saved to "${OUTPUT}"`,
      `Failed to generate diff for "${file}"`
    );
    break;
  }
}
