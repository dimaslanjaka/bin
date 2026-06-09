/**
 * git-diff-staged-ai.mjs
 *
 * Core library to show git diff of staged files with AI-powered conventional commit
 * message generation. Saves diff output and AI prompts to temporary files.
 *
 * This module is intentionally free of process.exit() and CLI arg parsing
 * so it can be imported and tested with Jest.
 *
 * Usage:
 *   git-diff-staged-ai              Show staged diff + generate commit message with AI
 *   git-diff-staged-ai <file>       Show staged diff of specific file + generate commit message
 */

import ansiColors from 'ansi-colors';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import { writefile } from 'sbg-utility';
import path from 'upath';
import { getTempPath } from '../binary-collections/config.cjs';
import { sha256 } from '../run-by-checksum/hash.cjs';
import * as ai from '@dimaslanjaka/ai-toolkit';
import { getArgs } from '../utils/index.cjs';

/**
 * Models supported by the Puter AI provider.
 * Source: https://developer.puter.com/tutorials/free-unlimited-claude-35-sonnet-api/
 */
const PUTER_SUPPORTED_MODELS = new Set([
  'claude-opus-4-8',
  'claude-opus-4.7-fast',
  'claude-opus-4-7',
  'claude-opus-4.6-fast',
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-opus-4-5',
  'claude-haiku-4-5',
  'claude-sonnet-4-5',
  'claude-opus-4-1',
  'claude-opus-4',
  'claude-sonnet-4'
]);

// Module-level args — used as default when main() is called without arguments
const args = getArgs();

// Temp path configuration
const FILENAME = sha256('staged-ai-' + JSON.stringify(args), 5);
const DIFF_OUTPUT = getTempPath(`git-diff-staged-ai/${FILENAME}.txt`);
const GPT_DIFF_OUTPUT = getTempPath(`git-diff-staged-ai/gpt-${FILENAME}.txt`);
const CACHE_DIR = path.dirname(DIFF_OUTPUT);

// Relative paths for display
const DIFF_OUTPUT_RELATIVE = path.relative(process.cwd(), DIFF_OUTPUT);
const GPT_DIFF_OUTPUT_RELATIVE = path.relative(process.cwd(), GPT_DIFF_OUTPUT);

// Ensure output directory exists
fs.ensureDirSync(CACHE_DIR, { mode: 0o755 });

/**
 * Executes a git diff command and saves the output to configured temp files.
 *
 * @param {string} command - The git diff command to execute
 * @param {string} successMessage - Message on success
 * @param {string} errorMessage - Message on failure
 * @param {object} [options] - Additional options.
 * @param {import('child_process').ExecSyncOptions} [options.execOptions] - Options forwarded to execSync (e.g. cwd, env, timeout).
 *   Spread after defaults, so these override encoding/maxBuffer if provided.
 * @param {boolean} [options.commit] - If true, after AI generates the commit message, save it to commit.txt and run git commit -F commit.txt.
 * @returns {boolean} True if diff has content, false if empty
 * @throws {Error} When the git command fails
 */
function runStagedDiff(command, successMessage, errorMessage, options = {}) {
  try {
    console.log(`Running command: ${command}`);
    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      ...(options.execOptions || {})
    });

    if (!result || result.trim() === '') {
      console.log('No staged changes found');
      writefile(DIFF_OUTPUT, '# No staged changes found\n');
      console.log(`Empty diff saved to "${DIFF_OUTPUT_RELATIVE}"`);
      return false;
    }

    // Save raw diff
    writefile(DIFF_OUTPUT, result);

    // Save AI prompt for conventional commit message generation
    const aiPrompt = [
      'Generate a conventional commit message from the staged diff below.',
      '',
      'Format: <type>(<scope>): <subject>',
      '',
      'Allowed types: build, ci, docs, feat, fix, perf, refactor, style, test, chore',
      '',
      'Rules:',
      '- Imperative mood, present tense ("add" not "added" or "adds")',
      '- No capital first letter, no period at end',
      '- Subject 72 characters or fewer',
      '',
      'Diff content:',
      '```',
      result,
      '```',
      '',
      'Output only the commit message as plain text.'
    ].join('\n');
    writefile(GPT_DIFF_OUTPUT, aiPrompt);

    console.log(`\u2705 ${successMessage}`);
    console.log(`AI prompt saved to "${ansiColors.green(GPT_DIFF_OUTPUT_RELATIVE)}"`);

    // Summary
    const lines = result.split('\n');
    const diffLines = lines.filter(function (l) {
      return l.startsWith('+') || l.startsWith('-');
    }).length;
    const fileCount = lines.filter(function (l) {
      return l.startsWith('diff --git');
    }).length;
    console.log(`Summary: ${fileCount} file(s) changed, ${diffLines} +/- lines`);

    return true;
  } catch (error) {
    console.error(`\u274c ${errorMessage}`);
    console.error(`Command: ${command}`);
    console.error(`Error: ${error.message}`);

    if (error.message.includes('not a git repository')) {
      console.error('Make sure you are in a git repository');
    }

    // Throw instead of process.exit — lets callers (or Jest) handle failures
    throw error;
  }
}

/**
 * Main entry point for the staged-diff + AI workflow.
 *
 * @param {object} [mainArgs] - Optional argument overrides.
 *   When omitted, falls back to module-level args from process.argv.
 *   Expected shape: { _: string[], help?: boolean, h?: boolean }
 */
async function main(mainArgs) {
  // Use provided args or fall back to module-level defaults
  const activeArgs = mainArgs || args;
  const activePositional = activeArgs._ || [];

  // Paths are always module-level (computed from module-level args on first load).
  // In tests, mock these via DIFF_OUTPUT / GPT_DIFF_OUTPUT exports if needed.

  const file = activePositional[0];
  let hasDiff;
  const diffOptions = {
    execOptions: {},
    commit: activeArgs.commit === true || activeArgs.commit === 'true'
  };

  if (file) {
    // Diff a specific staged file
    hasDiff = runStagedDiff(
      'git --no-pager diff --cached -- "' + file + '"',
      'Staged diff of "' + file + '" saved',
      'Failed to generate staged diff for "' + file + '"',
      diffOptions
    );
  } else {
    // Diff all staged files
    hasDiff = runStagedDiff(
      'git --no-pager diff --staged',
      'Staged diff saved successfully',
      'Failed to generate staged diff',
      diffOptions
    );
  }

  // Generate OpenCode prompt helper
  if (hasDiff) {
    const opencodePrompt = [
      '',
      'OpenCode Prompt Helper',
      '────────────────────────',
      '',
      'App Prompt:',
      '   Generate a conventional commit message from diff file: ' + DIFF_OUTPUT,
      '',
      'CLI Command:',
      '   opencode run "Generate a conventional commit message from diff file ' + DIFF_OUTPUT + '"',
      ''
    ].join('\n');

    const opencodePromptPath = getTempPath('git-diff-staged-ai/opencode-' + FILENAME + '.txt');
    writefile(opencodePromptPath, opencodePrompt);
    console.log(
      'OpenCode prompt saved to "' + ansiColors.green(path.relative(process.cwd(), opencodePromptPath)) + '"'
    );
  }

  // Always run AI commit message generation when changes exist
  if (hasDiff) {
    const model = activeArgs.model || 'claude-sonnet-4-6';

    // Validate model against Puter's supported list
    if (!PUTER_SUPPORTED_MODELS.has(model)) {
      throw new Error(`Unsupported model "${model}". Puter only supports: ${[...PUTER_SUPPORTED_MODELS].join(', ')}`);
    }

    console.log('Generating commit message with AI (puter)...');
    try {
      const prompt = fs.readFileSync(GPT_DIFF_OUTPUT, 'utf8');
      const puter = await ai.puter.puterProvider();
      const response = await puter.ai.chat(prompt, { model });
      const messages = response.message?.content;
      const buildMessage = [];
      if (Array.isArray(messages)) {
        messages.forEach((obj) => {
          buildMessage.push(obj.text);
        });
      } else {
        buildMessage.push(messages.text);
      }
      const message = buildMessage.join('\n');
      if (message.length > 0) {
        console.log('');
        console.log('─────────────────────────');
        console.log('SUGGESTED COMMIT MESSAGE:');
        console.log('─────────────────────────');
        console.log(message);
        console.log('');

        // Auto-commit if --commit was passed
        if (diffOptions.commit) {
          const commitPath = path.join(process.cwd(), 'commit.txt');
          fs.writeFileSync(commitPath, message, 'utf8');
          console.log(`Commit message saved to "${commitPath}"`);
          try {
            execSync('git commit -F "' + commitPath + '"', { stdio: 'inherit' });
            console.log('Commit successful.');
          } catch (error) {
            console.error('git commit failed:', error.message);
          } finally {
            fs.rmSync(commitPath, { force: true });
          }
        }
      } else {
        console.log('AI returned an empty response.');
      }
    } catch (error) {
      console.error('Error generating commit message:', error.message);
    }
  }

  // Diff content already saved to file and summary printed above.
  // Reference the file instead of dumping potentially large content to stdout.
  if (hasDiff) {
    console.log('');
    console.log(`Full diff saved to "${ansiColors.green(DIFF_OUTPUT_RELATIVE)}"`);
  }
}

export default runStagedDiff;
export {
  CACHE_DIR,
  DIFF_OUTPUT,
  DIFF_OUTPUT_RELATIVE,
  runStagedDiff as gitDiff,
  GPT_DIFF_OUTPUT,
  GPT_DIFF_OUTPUT_RELATIVE,
  main
};
