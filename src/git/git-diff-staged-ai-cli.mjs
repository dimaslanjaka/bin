#!/usr/bin/env node

import { main, DIFF_OUTPUT_RELATIVE, GPT_DIFF_OUTPUT_RELATIVE } from './git-diff-staged-ai.mjs';
import { getArgs } from '../utils/index.cjs';

function showHelp() {
  console.log('Git Diff Staged AI');
  console.log('');
  console.log('Show git diff of staged files and generate a conventional commit message via AI.');
  console.log('');
  console.log('Usage:');
  console.log('  git-diff-staged-ai                Show staged diff + AI commit message');
  console.log('  git-diff-staged-ai <file>         Show staged diff of specific file + AI commit message');
  console.log('  git-diff-staged-ai --help | -h    Show this help message');
  console.log('  git-diff-staged-ai --model=<name> Use a specific AI model (default: claude-sonnet-4-6)');
  console.log('  git-diff-staged-ai --commit        Auto-commit with the AI-generated message');
  console.log('');
  console.log('Output files:');
  console.log(`  Diff:     ${DIFF_OUTPUT_RELATIVE}`);
  console.log(`  AI Prompt: ${GPT_DIFF_OUTPUT_RELATIVE}`);
  process.exit(0);
}

const args = getArgs();

if (args.help || args.h) {
  showHelp();
}

(async () => {
  try {
    await main(args);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
})();
