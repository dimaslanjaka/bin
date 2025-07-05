#!/usr/bin/env node

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function showHelp() {
  console.log("Git Fix Utility");
  console.log("----------------------------");
  console.log("Fixes common Git configuration issues:");
  console.log("• Forces LF line endings (core.autocrlf = false)");
  console.log("• Ignores file permission changes (core.filemode = false)");
  console.log("• Sets pull strategy to false (prevents auto-rebase)");
  console.log("• Normalizes existing line endings");
  console.log("");
  console.log("Usage:");
  console.log("  git-fix                   Apply all fixes");
  console.log("  git-fix --lf-only         Force LF line endings only");
  console.log("  git-fix --permissions     Ignore file permissions only");
  console.log("  git-fix --normalize       Normalize existing files only");
  console.log("  git-fix --help | -h       Show this help message");
  console.log("");
  console.log("Options can be combined: git-fix --lf-only --permissions");
  process.exit(0);
}

function runGitCommand(args, description) {
  try {
    console.log(`[i] ${description}`);
    const result = spawnSync("git", args, { encoding: "utf-8" });

    if (result.status !== 0) {
      console.error(`[✗] Failed: ${description}`);
      console.error(`Error: ${result.stderr || result.stdout}`);
      return false;
    }

    console.log(`[✓] ${description}`);
    return true;
  } catch (error) {
    console.error(`[✗] Failed: ${description}`);
    console.error(`Error: ${error.message}`);
    return false;
  }
}

function isGitRepository() {
  try {
    execSync("git rev-parse --git-dir", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function forceLfLineEndings() {
  console.log("\n=== Configuring LF Line Endings ===");

  // Force LF line endings
  runGitCommand(["config", "core.autocrlf", "false"], "Disable automatic CRLF conversion");
  runGitCommand(["config", "core.eol", "lf"], "Set end-of-line to LF");

  // Create or update .gitattributes
  const gitattributesPath = path.join(process.cwd(), ".gitattributes");
  let gitattributesContent = "";

  if (fs.existsSync(gitattributesPath)) {
    gitattributesContent = fs.readFileSync(gitattributesPath, "utf8");
  }

  // Add line ending rules if not present
  const rules = [
    "* text=auto eol=lf",
    "*.{cmd,bat} text eol=crlf",
    "*.{png,jpg,jpeg,gif,ico,svg} binary",
    "*.{zip,tar,gz,7z,rar} binary"
  ];

  let modified = false;
  rules.forEach((rule) => {
    const rulePattern = rule.split(" ")[0];
    if (!gitattributesContent.includes(rulePattern)) {
      gitattributesContent += (gitattributesContent.endsWith("\n") ? "" : "\n") + rule + "\n";
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(gitattributesPath, gitattributesContent);
    console.log("[✓] Updated .gitattributes with line ending rules");
  } else {
    console.log("[i] .gitattributes already contains line ending rules");
  }
}

function ignoreFilePermissions() {
  console.log("\n=== Configuring File Permissions ===");

  runGitCommand(["config", "core.filemode", "false"], "Ignore file permission changes");
  runGitCommand(["config", "diff.ignoreSubmodules", "dirty"], "Ignore submodule permission changes");
}

function setPullStrategy() {
  console.log("\n=== Configuring Pull Strategy ===");

  runGitCommand(["config", "pull.rebase", "false"], "Disable automatic rebase on pull");
}

function normalizeLineEndings() {
  console.log("\n=== Normalizing Existing Files ===");

  try {
    // Check if there are any tracked files
    const result = execSync("git ls-files", { encoding: "utf-8", stdio: "pipe" });
    if (!result.trim()) {
      console.log("[i] No tracked files to normalize");
      return;
    }

    console.log("[i] Refreshing index to detect line ending changes...");
    execSync("git add --renormalize .", { stdio: "pipe" });

    // Check if there are changes after normalization
    try {
      const statusResult = execSync("git status --porcelain", { encoding: "utf-8", stdio: "pipe" });
      if (statusResult.trim()) {
        console.log("[✓] Line endings normalized for tracked files");
        console.log("[i] Files with updated line endings are now staged");
        console.log("[i] Run 'git status' to see the changes");
      } else {
        console.log("[✓] All files already have correct line endings");
      }
    } catch {
      console.log("[✓] Line ending normalization completed");
    }
  } catch (error) {
    console.error("[✗] Failed to normalize line endings");
    console.error(`Error: ${error.message}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

// Show help if requested
if (args.includes("--help") || args.includes("-h")) {
  showHelp();
}

// Check if we're in a git repository
if (!isGitRepository()) {
  console.error("[✗] Error: Not in a git repository");
  console.error("Please run this command from within a git repository");
  process.exit(1);
}

console.log("Git Fix Utility");
console.log("===============");

// Parse options
const options = {
  lfOnly: args.includes("--lf-only"),
  permissions: args.includes("--permissions"),
  normalize: args.includes("--normalize"),
  all: !args.some((arg) => arg.startsWith("--"))
};

// Execute requested fixes
if (options.all || options.lfOnly) {
  forceLfLineEndings();
}

if (options.all || options.permissions) {
  ignoreFilePermissions();
}

if (options.all) {
  setPullStrategy();
}

if (options.all || options.normalize) {
  normalizeLineEndings();
}

console.log("\n=== Summary ===");
console.log("[✓] Git fix utility completed successfully");

if (options.all || options.lfOnly || options.normalize) {
  console.log("[i] Line endings are now configured for LF");
}

if (options.all || options.permissions) {
  console.log("[i] File permission changes will be ignored");
}

console.log("[i] Repository is ready for cross-platform development");
