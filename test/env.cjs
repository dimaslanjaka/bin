const path = require("upath");
const fs = require("fs-extra");
const { spawnSync } = require("child_process");
const os = require("os");
const dotenv = require("dotenv");
const envPath = path.join(__dirname, "../.env");

if (fs.existsSync(envPath)) dotenv.config({ path: envPath, override: true, quiet: true });

const originalCwd = path.resolve(__dirname, "..");
module.exports.originalCwd = originalCwd;
const repoDir = path.join(__dirname, "../tmp/test-repo");
module.exports.repoDir = repoDir;
process.cwd = () => repoDir;
const nonGitDir = path.join(os.tmpdir(), "non-git-dir");
if (!fs.existsSync(nonGitDir)) {
  fs.mkdirSync(nonGitDir, { recursive: true });
}
module.exports.nonGitDir = nonGitDir;

function ensureRepoExists() {
  if (!fs.existsSync(path.join(repoDir, ".git"))) {
    const result = spawnSync(
      "git",
      ["clone", "--single-branch", "--branch", "test", "https://github.com/dimaslanjaka/test-repo.git", repoDir],
      {
        stdio: "inherit",
        shell: true
      }
    );
    if (!result || typeof result.status !== "number" || result.status !== 0) {
      throw new Error(
        `git clone failed with code ${result && typeof result.status === "number" ? result.status : "unknown"}`
      );
    }
  }
}
module.exports.ensureRepoExists = ensureRepoExists;

/**
 * Ensure yarn project is initialized in the test repo directory.
 * If package.json exists but yarn.lock does not, restore yarn.lock from backup or create empty.
 */
function ensureYarnProject() {
  const pkgJson = path.join(repoDir, "package.json");
  const yarnLock = path.join(repoDir, "yarn.lock");
  const yarnLockBak = path.join(repoDir, "yarn-lock.bak");

  const hasPkg = fs.existsSync(pkgJson);
  const hasLock = fs.existsSync(yarnLock);

  // no project at all → init yarn
  if (!hasPkg && !hasLock) {
    const result = spawnSync("yarn", ["init", "-y"], {
      cwd: repoDir,
      stdio: "inherit",
      shell: true
    });

    if (result?.status !== 0) {
      throw new Error(`yarn init failed with code ${result?.status ?? "unknown"}`);
    }

    return;
  }

  // Override package.json
  const pkgContent = JSON.parse(fs.readFileSync(pkgJson, "utf8"));
  pkgContent.dependencies = {
    jquery: "^3.6.0",
    lodash: "^4.17.21"
  };
  pkgContent.devDependencies = {
    "binary-collections": "*"
  };
  fs.writeFileSync(pkgJson, JSON.stringify(pkgContent, null, 2), "utf8");

  // package.json exists but lockfile missing → restore or create
  if (hasPkg && !hasLock) {
    if (fs.existsSync(yarnLockBak)) {
      fs.renameSync(yarnLockBak, yarnLock);
    } else {
      fs.writeFileSync(yarnLock, "");
    }
  }
}

module.exports.ensureYarnProject = ensureYarnProject;

function installYarnPackage() {
  const TGZ_PATH = path.resolve(__dirname, "../releases/bin.tgz");
  const TEST_REPO = repoDir;
  if (!fs.existsSync(TGZ_PATH)) {
    throw new Error(`tgz file not found: ${TGZ_PATH}. Please run "yarn build" before testing.`);
  }
  const result = spawnSync("yarn", ["add", `binary-collections@${TGZ_PATH}`], {
    cwd: TEST_REPO,
    stdio: "inherit",
    shell: true
  });
  if (!result || typeof result.status !== "number" || result.status !== 0) {
    const stdout = result && typeof result.stdout !== "undefined" ? result.stdout.toString() : "";
    const stderr = result && typeof result.stderr !== "undefined" ? result.stderr.toString() : "";
    throw new Error(
      `yarn add failed with code ${result && typeof result.status === "number" ? result.status : "unknown"}\n` +
        `stdout: ${stdout}\n` +
        `stderr: ${stderr}`
    );
  }
}
module.exports.installYarnPackage = installYarnPackage;
