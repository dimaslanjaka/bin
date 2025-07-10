const { execSync, spawnSync } = require("child_process");
/**
 * Execute a git command with proper error handling and logging
 * @param {string[]} args - Git command arguments
 * @param {string} description - Description of the operation for logging
 * @returns {boolean} - True if successful, false otherwise
 */
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

/**
 * Check if the current directory is a git repository
 * @returns {boolean} - True if in a git repository, false otherwise
 */
function isGitRepository() {
  try {
    execSync("git rev-parse --git-dir", { stdio: "pipe", cwd: process.cwd() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute a git command and return stdout (or null on error)
 * @param {string[]} args - Git command arguments
 * @param {string} description - Description of the operation for logging
 * @returns {string|null} - stdout string if successful, null otherwise
 */
function runGitCommandOutput(args, description) {
  try {
    console.log(`[i] ${description}`);
    const result = spawnSync("git", args, { encoding: "utf-8" });
    if (result.status !== 0) {
      console.error(`[✗] Failed: ${description}`);
      console.error(`Error: ${result.stderr || result.stdout}`);
      return null;
    }
    console.log(`[✓] ${description}`);
    return result.stdout.trim();
  } catch (error) {
    console.error(`[✗] Failed: ${description}`);
    console.error(`Error: ${error.message}`);
    return null;
  }
}

module.exports = {
  runGitCommand,
  runGitCommandOutput,
  isGitRepository
};
