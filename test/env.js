const path = require("upath");
const fs = require("fs-extra");
const { spawnSync } = require("child_process");
const os = require("os");
// Load .env file for project environment
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const originalCwd = process.cwd();
module.exports.originalCwd = originalCwd;
const repoDir = path.join(__dirname, "../tmp/test-repo");
module.exports.repoDir = repoDir;
process.cwd = () => repoDir;
const nonGitDir = path.join(os.tmpdir(), "non-git-dir");
if (!fs.existsSync(nonGitDir)) {
  fs.mkdirSync(nonGitDir, { recursive: true });
}
module.exports.nonGitDir = nonGitDir;

if (!fs.existsSync(path.join(repoDir, ".git"))) {
  const result = spawnSync("git", ["clone", "https://github.com/dimaslanjaka/test-repo.git", repoDir], {
    stdio: "inherit"
  });
  if (!result || typeof result.status !== "number" || result.status !== 0) {
    throw new Error(
      `git clone failed with code ${result && typeof result.status === "number" ? result.status : "unknown"}`
    );
  }
}
