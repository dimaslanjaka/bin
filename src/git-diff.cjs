#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { getTempPath } = require("./binary-collections-config");

// Output path using centralized temp directory configuration
const OUTPUT = getTempPath("git-diff.txt");
const CACHE_DIR = path.dirname(OUTPUT);

// Ensure output directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function showHelp() {
  console.log("Git Diff Helper");
  console.log("----------------------------");
  console.log("Usage:");
  console.log("  git-diff FILE             Show staged diff of specified file");
  console.log("  git-diff --staged-only    Show staged diff of all files");
  console.log("  git-diff -s | -S          Same as --staged-only");
  console.log("  git-diff --help | -h      Show this help message");
  console.log("");
  console.log(`Output is saved to: ${OUTPUT}`);
  process.exit(0);
}

function runGitDiff(command, successMessage, errorMessage) {
  try {
    console.log(`[i] Running command: ${command}`);
    const result = execSync(command, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer to handle large diffs
    });

    // If result is empty, inform user but don't treat as error
    if (!result || result.trim() === "") {
      console.log(`[i] No changes found for the specified criteria`);
      fs.writeFileSync(OUTPUT, "# No changes found\n");
      console.log(`[✓] Empty diff saved to "${OUTPUT}"`);
      return;
    }

    fs.writeFileSync(OUTPUT, result);
    console.log(`[✓] ${successMessage}`);
  } catch (error) {
    console.error(`[✗] ${errorMessage}`);
    console.error(`Command: ${command}`);
    console.error(`Error: ${error.message}`);

    // Check if it's a git-related error
    if (error.message.includes("not a git repository")) {
      console.error("Make sure you are in a git repository");
    }

    process.exit(1);
  }
}

const { getArgs } = require("./utils.js");
const args = getArgs();
const positional = args._ || [];

// Show help if no arguments or --help/-h is passed
if (args.help || args.h) {
  showHelp();
}

if (args["staged-only"] || args.s || args.S) {
  runGitDiff("git --no-pager diff --staged", `Full staged diff saved to "${OUTPUT}"`, "Failed to save staged diff");
} else {
  // Handle specific file diff
  const file = positional[0];
  if (!file) {
    runGitDiff("git --no-pager diff", `Full staged diff saved to "${OUTPUT}"`, "Failed to save all diff's");
  } else {
    runGitDiff(
      `git --no-pager diff --cached -- "${file}"`,
      `Staged diff of "${file}" saved to "${OUTPUT}"`,
      `Failed to generate diff for "${file}"`
    );
  }
}
