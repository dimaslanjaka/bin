#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { getTempPath } = require("./binary-collections-config");

// Output path using centralized temp directory configuration
const DIFF_OUTPUT = getTempPath("git-diff.txt");
const GPT_DIFF_OUTPUT = getTempPath("gpt-question.txt");
const CACHE_DIR = path.dirname(DIFF_OUTPUT);

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
  console.log(`\u{1F4BE} Output is saved to: ${DIFF_OUTPUT}`);
  process.exit(0);
}

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
      console.log(`\u{2705} Empty diff saved to "${DIFF_OUTPUT}"`);
      return;
    }

    fs.writeFileSync(DIFF_OUTPUT, result);
    fs.writeFileSync(
      GPT_DIFF_OUTPUT,
      `Hello, ChatGPT!\nCan you create a conventional commit message by diff content below:\n\n\`\`\`${result}\n\`\`\`\n\nGive me result as codeblock with language "text" only.\n\nThank you!`
    );
    console.log(`\u{2705} ${successMessage}`);
    console.log(`\u{1F4BE} GPT diff prompt saved to "${GPT_DIFF_OUTPUT}"`);
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

const { getArgs } = require("./utils/index.cjs");
const args = getArgs();
const positional = args._ || [];

// Show help if no arguments or --help/-h is passed
if (args.help || args.h) {
  showHelp();
}

if (args["staged-only"] || args.s || args.S) {
  runGitDiff(
    "git --no-pager diff --staged",
    `Full staged diff saved to "${DIFF_OUTPUT}"`,
    "Failed to save staged diff"
  );
} else {
  // Handle specific file diff
  const file = positional[0];
  if (!file) {
    runGitDiff("git --no-pager diff", `Full staged diff saved to "${DIFF_OUTPUT}"`, "Failed to save all diff's");
  } else {
    runGitDiff(
      `git --no-pager diff --cached -- "${file}"`,
      `Staged diff of "${file}" saved to "${DIFF_OUTPUT}"`,
      `Failed to generate diff for "${file}"`
    );
  }
}
