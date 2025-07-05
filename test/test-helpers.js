/* eslint-env jest */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Test helper functions for git-fix testing
 */

/**
 * Create a temporary git repository for testing
 * @param {string} tempDir - Temporary directory path
 */
function createTempGitRepo(tempDir) {
  // Ensure directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Initialize git repo
  execSync("git init", { cwd: tempDir, stdio: "pipe" });

  // Set basic git config for the repository
  execSync('git config user.name "Test User"', { cwd: tempDir, stdio: "pipe" });
  execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: "pipe" });

  // Create a test file
  fs.writeFileSync(path.join(tempDir, "test.txt"), "test content\n");

  // Add and commit
  execSync("git add .", { cwd: tempDir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: "pipe" });
}

/**
 * Clean up temporary directory
 * @param {string} tempDir - Temporary directory path
 */
function cleanupTempDir(tempDir) {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Get git config value
 * @param {string} key - Git config key
 * @param {string} cwd - Working directory
 * @param {boolean} localOnly - If true, only check local repository config
 * @returns {string|null} Config value or null if not set
 */
function getGitConfig(key, cwd = process.cwd(), localOnly = false) {
  try {
    const configFlag = localOnly ? "--local" : "";
    return execSync(`git config ${configFlag} ${key}`, { cwd, encoding: "utf-8" }).trim();
  } catch {
    // If local-only check failed, try without --local flag
    if (localOnly) {
      try {
        return execSync(`git config ${key}`, { cwd, encoding: "utf-8" }).trim();
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Mock process.argv for testing
 * @param {string[]} args - Arguments to set
 */
function mockProcessArgv(args) {
  const originalArgv = process.argv;
  process.argv = ["node", "git-fix.cjs", ...args];
  return originalArgv;
}

/**
 * Restore process.argv
 * @param {string[]} originalArgv - Original argv to restore
 */
function restoreProcessArgv(originalArgv) {
  process.argv = originalArgv;
}

module.exports = {
  createTempGitRepo,
  cleanupTempDir,
  getGitConfig,
  mockProcessArgv,
  restoreProcessArgv
};
