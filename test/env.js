const path = require("upath");
const fs = require("fs-extra");
const { spawnSync } = require("child_process");

const repoDir = path.join(__dirname, "../tmp/test-repo");
module.exports.repoDir = repoDir;
process.cwd = () => repoDir;

if (!fs.existsSync(path.join(process.cwd(), ".git"))) {
  const result = spawnSync("git", ["clone", "https://github.com/dimaslanjaka/test-repo.git", process.cwd()], {
    stdio: "inherit"
  });
  if (!result || typeof result.status !== "number" || result.status !== 0) {
    throw new Error(
      `git clone failed with code ${result && typeof result.status === "number" ? result.status : "unknown"}`
    );
  }
}
