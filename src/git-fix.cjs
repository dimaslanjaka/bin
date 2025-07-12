#!/usr/bin/env node

const { isGitRepository } = require("./git/utils.cjs");
const { forceLfLineEndings } = require("./git/line-endings.cjs");
const { ignoreFilePermissions } = require("./git/permissions.cjs");
const { setPullStrategy } = require("./git/pull-strategy.cjs");
const { configureGitUser } = require("./git/user-config.cjs");
const { normalizeLineEndings } = require("./git/normalize.cjs");
const { getArgs } = require("./utils.js");
const path = require("upath");

function showHelp() {
  console.log("Git Fix Utility");
  console.log("----------------------------");
  console.log("Fixes common Git configuration issues:");
  console.log("• Forces LF line endings (core.autocrlf = false)");
  console.log("• Ignores file permission changes (core.filemode = false)");
  console.log("• Sets pull strategy to false (prevents auto-rebase)");
  console.log("• Normalizes existing line endings");
  console.log("• Configures Git user from environment variables");
  console.log("");
  console.log("Usage:");
  console.log("  git-fix                        Apply all fixes");
  console.log("  git-fix --lf-only              Force LF line endings only");
  console.log("  git-fix --permissions          Ignore file permissions only");
  console.log("  git-fix --normalize            Normalize existing files only");
  console.log("  git-fix --user                 Configure Git user from environment");
  console.log("  git-fix --user NAME EMAIL      Configure Git user with specified name and email");
  console.log("  git-fix --help | -h            Show this help message");
  console.log("");
  console.log("Options can be combined: git-fix --lf-only --permissions");
  console.log("");
  console.log("User configuration precedence:");
  console.log("  1. CLI arguments (--user NAME EMAIL)");
  console.log("  2. Environment variables (GITHUB_USER, GITHUB_EMAIL)");
  console.log("  3. Skip if neither provided");
  console.log("");
  console.log("Environment variables for --user option:");
  console.log("  GITHUB_USER   - Git username (for user.name)");
  console.log("  GITHUB_EMAIL  - Git email (for user.email)");
  process.exit(0);
}

const args = getArgs();

let userConfig = { hasUserFlag: false, cliUser: null, cliEmail: null };
if (Object.prototype.hasOwnProperty.call(args, "user")) {
  userConfig.hasUserFlag = true;
  // args.user can be string, array, or boolean
  if (Array.isArray(args.user)) {
    if (args.user.length === 2) {
      userConfig.cliUser = args.user[0];
      userConfig.cliEmail = args.user[1];
    } else if (args.user.length === 1) {
      // Only one value provided, error
      console.error("[✗] Error: --user requires both NAME and EMAIL or no arguments");
      console.error("Usage: --user (uses environment variables) or --user NAME EMAIL");
      process.exit(1);
    }
    // If length === 0, treat as env
  } else if (typeof args.user === "string") {
    // Only one value provided, error
    console.error("[✗] Error: --user requires both NAME and EMAIL or no arguments");
    console.error("Usage: --user (uses environment variables) or --user NAME EMAIL");
    process.exit(1);
  }
}

// Show help if requested
if (args.help || args.h) {
  showHelp();
  process.exit(0); // Exit after showing help
}

console.log("[i] Current working directory:", path.toUnix(process.cwd()));

// Check if we're in a git repository
if (!isGitRepository(process.cwd())) {
  console.error("[✗] Error: Not in a git repository");
  console.error("Please run this command from within a git repository");
  process.exit(1);
} else {
  console.log("[✓] Detected git repository");
}

console.log("Git Fix Utility");
console.log("===============");

// Parse options
const options = {
  lfOnly: args["lf-only"] === true,
  permissions: args["permissions"] === true,
  normalize: args["normalize"] === true,
  user: userConfig.hasUserFlag,
  updateRemote: args["update-remote"] === true,
  all: Object.keys(args).filter((k) => k !== "_" && args[k] === true).length === 0 && !userConfig.hasUserFlag
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

if (options.all || options.user) {
  configureGitUser(userConfig.cliUser, userConfig.cliEmail, { updateRemote: options.updateRemote });
} else if (options.updateRemote) {
  // If --update-remote is present without --user or --all, still call configureGitUser
  configureGitUser(null, null, { updateRemote: true });
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

if (options.all || options.user) {
  const username = userConfig.cliUser || process.env.GITHUB_USER?.trim();
  const email = userConfig.cliEmail || process.env.GITHUB_EMAIL?.trim();
  if (username || email) {
    console.log("[i] Git user configuration has been applied");
  }
}

console.log("[i] Repository is ready for cross-platform development");
