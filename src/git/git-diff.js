#!/usr/bin/env node

import ansiColors from 'ansi-colors';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import { md5, writefile } from 'sbg-utility';
import path from 'upath';
import { fileURLToPath } from 'url';
import { getTempPath } from '../binary-collections/config.cjs';
import { runChatGpt } from '../utils/chatgpt.js';
import { getArgs } from '../utils/index.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const args = getArgs();
const positional = args._ || [];

// Output path using centralized temp directory configuration
const FILENAME = md5((positional[0] || 'default') + JSON.stringify(args));
const DIFF_OUTPUT = getTempPath(`git-diff/${FILENAME}.txt`);
const GPT_DIFF_OUTPUT = getTempPath(`git-diff/gpt-${FILENAME}.txt`);
const CACHE_DIR = path.dirname(DIFF_OUTPUT);

// Relative paths for display in logs
const DIFF_OUTPUT_RELATIVE = path.relative(process.cwd(), DIFF_OUTPUT);
const GPT_DIFF_OUTPUT_RELATIVE = path.relative(process.cwd(), GPT_DIFF_OUTPUT);

// Ensure output directory exists
fs.ensureDirSync(CACHE_DIR, { mode: 0o755 });

function showHelp() {
  console.log('📋 Git Diff Helper');
  console.log('Usage:');
  console.log('  git-diff FILE             Show staged diff of specified file');
  console.log('  git-diff --staged-only    Show staged diff of all files');
  console.log('  git-diff -s | -S          Same as --staged-only');
  console.log('  git-diff --unstaged FILE  Show unstaged diff of specified file');
  console.log('  git-diff --unstaged       Show unstaged diff of all files');
  console.log('  git-diff -u               Same as --unstaged');
  console.log('  git-diff --ai             Run ChatGPT automation for commit message');
  console.log('  git-diff --help | -h      Show this help message');
  console.log('');
  console.log(`💾 Output is saved to: ${DIFF_OUTPUT_RELATIVE}`);
  console.log(`🤖 GPT prompt is saved to: ${GPT_DIFF_OUTPUT_RELATIVE}`);
  process.exit(0);
}

/**
 * Executes a git diff command and saves the output to configured temp files.
 *
 * This function runs the specified git command, captures its output, and saves it to two files:
 * - A standard diff output file for manual inspection
 * - A GPT-formatted prompt file for generating conventional commit messages
 *
 * @param {string} command - The git command to execute (e.g., "git --no-pager diff --staged")
 * @param {string} successMessage - Message to display when the command executes successfully
 * @param {string} errorMessage - Message to display when the command fails
 * @returns {boolean} True when diff content exists, false when no changes were found
 *
 * @throws {Error} Exits the process with code 1 if the git command fails
 *
 * @example
 * // Generate staged diff for all files
 * runGitDiff(
 *   "git --no-pager diff --staged",
 *   "Staged diff saved successfully",
 *   "Failed to generate staged diff"
 * );
 *
 * @example
 * // Generate diff for a specific file
 * runGitDiff(
 *   'git --no-pager diff --cached -- "src/file.js"',
 *   'File diff saved successfully',
 *   'Failed to generate file diff'
 * );
 */
function runGitDiff(command, successMessage, errorMessage) {
  try {
    console.log(`ℹ️  Running command: ${command}`);
    const result = execSync(command, {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer to handle large diffs
    });

    // If result is empty, inform user but don't treat as error
    if (!result || result.trim() === '') {
      console.log(`ℹ️  No changes found for the specified criteria`);
      writefile(DIFF_OUTPUT, '# No changes found\n');
      console.log(`✅ Empty diff saved to "${DIFF_OUTPUT_RELATIVE}"`);
      return false;
    }

    writefile(DIFF_OUTPUT, result);
    writefile(
      GPT_DIFF_OUTPUT,
      `Hello!\nCan you create a conventional commit message by diff content below:\n\n\`\`\`${result}\n\`\`\`\n\nGive me result as codeblock with language "text" only.\n\nThank you!`
    );
    console.log(`✅ ${successMessage}`);
    console.log(`💾 GPT diff prompt saved to "${ansiColors.green(GPT_DIFF_OUTPUT_RELATIVE)}"`);
    return true;
  } catch (error) {
    console.error(`❌ ${errorMessage}`);
    console.error(`❌ Command: ${command}`);
    console.error(`❌ Error: ${error.message}`);

    // Check if it's a git-related error
    if (error.message.includes('not a git repository')) {
      console.error('❌ Make sure you are in a git repository');
    }

    process.exit(1);
  }
}

/**
 * Generates diff-formatted output for untracked files.
 * Uses `git ls-files --others --exclude-standard` to find untracked files,
 * then creates synthetic git diff entries for each.
 *
 * @returns {string} Formatted diff content for untracked files, or empty string if none
 */
function getUntrackedDiff() {
  try {
    const untrackedStr = execSync('git ls-files --others --exclude-standard', {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10
    }).trim();
    if (!untrackedStr) return '';
    const untrackedFiles = untrackedStr.split('\n').filter(function (f) {
      return f;
    });
    if (untrackedFiles.length === 0) return '';

    var result = '\n# Untracked files:\n';
    for (var i = 0; i < untrackedFiles.length; i++) {
      var file = untrackedFiles[i];
      if (!fs.existsSync(file)) continue;
      var stat = fs.statSync(file);
      if (!stat.isFile()) continue;

      var content;
      try {
        content = fs.readFileSync(file, 'utf8');
      } catch (_a) {
        continue; // skip binary files
      }

      var lines = content.split('\n');
      // Remove trailing empty line from split
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
      }

      result += 'diff --git a/' + file + ' b/' + file + '\n';
      result += 'new file mode 100644\n';
      result += 'index 0000000..0000000\n';
      result += '--- /dev/null\n';
      result += '+++ b/' + file + '\n';
      result += '@@ -0,0 +1,' + (lines.length || 0) + ' @@\n';
      for (var j = 0; j < lines.length; j++) {
        result += '+' + lines[j] + '\n';
      }
    }
    return result;
  } catch (_b) {
    return '';
  }
}

function fileHasChanges(file, mode) {
  const command = mode === 'staged' ? `git diff --cached --quiet -- "${file}"` : `git diff --quiet -- "${file}"`;

  try {
    execSync(command, { stdio: 'ignore' });
    return false;
  } catch (error) {
    if (error.status === 1) {
      return true;
    }

    throw error;
  }
}

async function mainGitDiff() {
  // Show help if no arguments or --help/-h is passed
  if (args.help || args.h) {
    showHelp();
  }

  const useUnstaged = args.unstaged || args.u;
  const fileFromFlag = typeof args.unstaged === 'string' ? args.unstaged : typeof args.u === 'string' ? args.u : null;

  let hasDiff = false;

  if (args['staged-only'] || args.s || args.S) {
    hasDiff = runGitDiff(
      'git --no-pager diff --staged',
      `Full staged diff saved to "${ansiColors.green(DIFF_OUTPUT_RELATIVE)}"`,
      'Failed to save staged diff'
    );
  } else {
    // Handle specific file diff
    const file = positional[0] || fileFromFlag;
    if (!file) {
      const fullDiffModeLabel = useUnstaged ? 'unstaged' : 'unstaged';
      hasDiff = runGitDiff(
        'git --no-pager diff',
        `Full ${fullDiffModeLabel} diff saved to "${ansiColors.green(DIFF_OUTPUT_RELATIVE)}"`,
        "Failed to save all diff's"
      );
      // Save untracked file diffs to separate file
      const untrackedDiff = getUntrackedDiff();
      if (untrackedDiff) {
        const UNTRACKED_DIFF_OUTPUT = getTempPath(`git-diff/untracked-${FILENAME}.txt`);
        const UNTRACKED_GPT_DIFF_OUTPUT = getTempPath(`git-diff/gpt-untracked-${FILENAME}.txt`);
        const UNTRACKED_DIFF_OUTPUT_RELATIVE = path.relative(process.cwd(), UNTRACKED_DIFF_OUTPUT);

        writefile(UNTRACKED_DIFF_OUTPUT, untrackedDiff);
        writefile(
          UNTRACKED_GPT_DIFF_OUTPUT,
          `Hello!\nCan you create a conventional commit message by diff content below:\n\n\`\`\`${untrackedDiff}\n\`\`\`\n\nGive me result as codeblock with language "text" only.\n\nThank you!`
        );
        console.log(`✅ Untracked file diff saved to "${ansiColors.green(UNTRACKED_DIFF_OUTPUT_RELATIVE)}"`);
        console.log(
          `💾 AI diff prompt saved to "${ansiColors.green(path.relative(process.cwd(), UNTRACKED_GPT_DIFF_OUTPUT))}"`
        );
        hasDiff = true;
      }
    } else {
      let fileDiffMode = useUnstaged ? 'unstaged' : 'staged';

      // Default behavior for file target: prefer staged changes, then fall back to unstaged.
      if (!useUnstaged && !fileHasChanges(file, 'staged') && fileHasChanges(file, 'unstaged')) {
        fileDiffMode = 'unstaged';
      }

      hasDiff = runGitDiff(
        fileDiffMode === 'unstaged' ? `git --no-pager diff -- "${file}"` : `git --no-pager diff --cached -- "${file}"`,
        `${fileDiffMode[0].toUpperCase() + fileDiffMode.slice(1)} diff of "${file}" saved to "${ansiColors.green(
          DIFF_OUTPUT_RELATIVE
        )}"`,
        `Failed to generate ${fileDiffMode} diff for "${file}"`
      );
    }
  }

  if (hasDiff) {
    // Generate command prompt for opencode CLI
    const opencodePrompt = [
      '',
      '🤖 OpenCode Prompt Helper',
      '────────────────────────',
      '',
      '📄 App Prompt:',
      `   Generate a conventional commit message from diff file: ${DIFF_OUTPUT}`,
      '',
      '💻 CLI Command:',
      `   opencode run "Generate a conventional commit message from diff file ${DIFF_OUTPUT}"`,
      ''
    ];

    const opencodePromptPath = getTempPath(`git-diff/opencode-${FILENAME}.txt`);
    writefile(opencodePromptPath, opencodePrompt.join('\n'));

    console.log(`✅ OpenCode prompt saved to "${ansiColors.green(path.relative(process.cwd(), opencodePromptPath))}"`);
  }

  // Generate commit message prompt from ChatGPT (only if --ai is specified)
  if (args.ai) {
    try {
      await runChatGpt({ headless: true, questionFile: GPT_DIFF_OUTPUT });
    } catch (error) {
      console.error('❌ Error running ChatGPT:', error.message);
      console.error('💡 Try running with visible browser mode or check if Chrome is installed');
    }
  } else {
    console.log('💡 Use --ai flag to generate commit message with ChatGPT');
  }
}

export default runGitDiff;
export {
  CACHE_DIR,
  DIFF_OUTPUT,
  DIFF_OUTPUT_RELATIVE,
  runGitDiff as gitDiff,
  GPT_DIFF_OUTPUT,
  GPT_DIFF_OUTPUT_RELATIVE,
  mainGitDiff
};
