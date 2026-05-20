#!/usr/bin/env node

const { execSync, spawnSync } = require("child_process");
const fs = require("fs-extra");
const minimist = require("minimist");

/**
 * Run shell command and return stdout
 */
function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: "pipe", ...opts }).trim();
  } catch (err) {
    console.error(err.stderr?.toString() || err.message);
    process.exit(err.status || 1);
  }
}

/**
 * Get current git branch
 */
function getBranchName() {
  return run("git rev-parse --abbrev-ref HEAD");
}

/**
 * Make branch name filesystem-safe
 */
function safeBranchName(name) {
  return name.replace(/\//g, "-").replace(/\\/g, "-");
}

/**
 * Find yarn binary
 */
function findYarn() {
  try {
    const yarnPaths = run(process.platform === "win32" ? "where yarn" : "which yarn")
      .split(/\r?\n/)
      .filter(Boolean);

    if (process.platform === "win32") {
      const cmdLauncher = yarnPaths.find((entry) => /\.cmd$/i.test(entry));
      return cmdLauncher || yarnPaths[0] || null;
    }

    return yarnPaths[0] || null;
  } catch {
    return null;
  }
}

/**
 * Run yarn and fail loudly if it cannot start or exits non-zero
 */
function runYarn(yarnPath, args) {
  const result =
    process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", yarnPath, ...args], { stdio: "inherit" })
      : spawnSync(yarnPath, args, { stdio: "inherit" });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

/**
 * Copy file if exists
 */
function copyFile(src, dst) {
  if (fs.existsSync(src)) {
    console.log(`Copying ${src} -> ${dst}`);
    fs.copyFileSync(src, dst);
  }
}

/**
 * Empty file
 */
function emptyFile(filePath) {
  console.log(`Emptying file: ${filePath}`);
  fs.writeFileSync(filePath, "");
}

/**
 * Help message
 */
function showHelp() {
  console.log(`
Usage:
  yarn-lock-sync [options]

Options:
  --up <packages...>   Run "yarn up" with packages
  -h, --help           Show help

Examples:
  yarn-lock-sync
  yarn-lock-sync --up lodash axios
`);
}

function main() {
  const argv = minimist(process.argv.slice(2), {
    boolean: ["help", "h"],
    alias: {
      h: "help"
    }
  });

  // ✅ Help handler
  if (argv.help) {
    showHelp();
    process.exit(0);
  }

  const up = argv._.length ? argv._ : null;

  const branch = getBranchName();
  const safeBranch = safeBranchName(branch);

  const yarnLock = "yarn.lock";
  const branchLock = `yarn.${safeBranch}.lock`;

  const yarnPath = findYarn();
  if (!yarnPath) {
    console.error("Error: Yarn not found in PATH.");
    process.exit(1);
  }

  const branchLockExists = fs.existsSync(branchLock);
  const yarnLockExists = fs.existsSync(yarnLock);

  // Step 1: restore branch lock if exists
  if (branchLockExists) {
    console.log(`Restoring branch lock: ${branchLock} -> ${yarnLock}`);
    copyFile(branchLock, yarnLock);
  } else {
    console.log("No branch lock found.");

    if (yarnLockExists) {
      console.log("Existing yarn.lock found but no branch lock -> resetting yarn.lock");
      emptyFile(yarnLock);
    }
  }

  // Step 2: run yarn command
  if (up) {
    console.log(`Running yarn up ${up.join(" ")} ...`);
    runYarn(yarnPath, ["up", ...up]);
  } else {
    console.log("Running yarn install...");
    runYarn(yarnPath, ["install"]);
  }

  // Step 3: save updated lock
  if (fs.existsSync(yarnLock)) {
    console.log(`Saving updated lock: ${yarnLock} -> ${branchLock}`);
    copyFile(yarnLock, branchLock);
  } else {
    console.warn("Warning: yarn.lock not found after install/up");
  }
}

main();
