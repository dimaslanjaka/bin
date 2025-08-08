#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { getTempPath } from "./binary-collections-config.cjs";
import { runChatGpt } from "./utils/chatgpt.js";
import { getArgs } from "./utils/index.cjs";

// Output path using centralized temp directory configuration
const DIFF_OUTPUT = getTempPath("git-diff.txt");
const GPT_DIFF_OUTPUT = getTempPath("gpt-question.txt");
const CACHE_DIR = path.dirname(DIFF_OUTPUT);

// Relative paths for display in logs
const DIFF_OUTPUT_RELATIVE = path.relative(process.cwd(), DIFF_OUTPUT);
const GPT_DIFF_OUTPUT_RELATIVE = path.relative(process.cwd(), GPT_DIFF_OUTPUT);

// Ensure output directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function showHelp() {
  console.log("\u{1F4DD} Git Diff Helper");
  console.log("\u{1F4C4} Usage:");
  console.log("  \u{1F4C2} git-diff FILE             Show staged diff of specified file");
  console.log("  \u{1F4C2} git-diff --staged-only    Show staged diff of all files");
  console.log("  \u{1F4C2} git-diff -s | -S          Same as --staged-only");
  console.log("  \u{1F4C2} git-diff --help | -h      Show this help message");
  console.log("");
  console.log(`\u{1F4BE} Output is saved to: ${DIFF_OUTPUT_RELATIVE}`);
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
    console.log(`\u{1F50E} [i] Running command: ${command}`);
    const result = execSync(command, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer to handle large diffs
    });

    // If result is empty, inform user but don't treat as error
    if (!result || result.trim() === "") {
      console.log(`\u{1F6C8} [i] No changes found for the specified criteria`);
      fs.writeFileSync(DIFF_OUTPUT, "# No changes found\n");
      console.log(`\u{2705} Empty diff saved to "${DIFF_OUTPUT_RELATIVE}"`);
      return;
    }

    fs.writeFileSync(DIFF_OUTPUT, result);
    fs.writeFileSync(
      GPT_DIFF_OUTPUT,
      `Hello, ChatGPT!\nCan you create a conventional commit message by diff content below:\n\n\`\`\`${result}\n\`\`\`\n\nGive me result as codeblock with language "text" only.\n\nThank you!`
    );
    console.log(`\u{2705} ${successMessage}`);
    console.log(`\u{1F4BE} GPT diff prompt saved to "${GPT_DIFF_OUTPUT_RELATIVE}"`);
  } catch (error) {
    console.error(`\u{274C} ${errorMessage}`);
    console.error(`\u{1F4DD} Command: ${command}`);
    console.error(`\u{26A0} Error: ${error.message}`);

    // Check if it's a git-related error
    if (error.message.includes("not a git repository")) {
      console.error("\u{1F6A7} Make sure you are in a git repository");
    }

    process.exit(1);
  }
}

function mainGitDiff() {
  const args = getArgs();
  const positional = args._ || [];

  // Show help if no arguments or --help/-h is passed
  if (args.help || args.h) {
    showHelp();
  }

  if (args["staged-only"] || args.s || args.S) {
    runGitDiff(
      "git --no-pager diff --staged",
      `Full staged diff saved to "${DIFF_OUTPUT_RELATIVE}"`,
      "Failed to save staged diff"
    );
  } else {
    // Handle specific file diff
    const file = positional[0];
    if (!file) {
      runGitDiff(
        "git --no-pager diff",
        `Full staged diff saved to "${DIFF_OUTPUT_RELATIVE}"`,
        "Failed to save all diff's"
      );
    } else {
      runGitDiff(
        `git --no-pager diff --cached -- "${file}"`,
        `Staged diff of "${file}" saved to "${DIFF_OUTPUT_RELATIVE}"`,
        `Failed to generate diff for "${file}"`
      );
    }
  }

  // Generate commit message prompt from ChatGPT
  runChatGpt({ headless: false, questionFile: GPT_DIFF_OUTPUT });
}

export default runGitDiff;
export { runGitDiff as gitDiff };

if (import.meta.url === `file://${process.argv[1]}`) {
  mainGitDiff();
}
