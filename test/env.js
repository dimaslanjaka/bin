const { path } = require("sbg-utility");
const fs = require("fs-extra");
const { spawnSync } = require("child_process");

process.cwd = () => path.join(__dirname, "../tmp/test-repo");

if (!fs.existsSync(path.join(process.cwd(), ".git"))) {
  const result = spawnSync("git", ["clone", "https://github.com/dimaslanjaka/test-repo.git", process.cwd()], {
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(`git clone failed with code ${result.status}`);
  }
}
