const path = require("upath");
const fs = require("fs-extra");
const { spawnSync } = require("child_process");
const os = require("os");
const dotenv = require("dotenv");

const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true, quiet: true });
}

const originalCwd = path.resolve(__dirname, "..");
const repoDir = path.join(__dirname, "../tmp/test-repo");
const nonGitDir = path.join(os.tmpdir(), "non-git-dir");

fs.ensureDirSync(nonGitDir);

// ⚠️ avoid overwriting global process.cwd (breaks libs/tests unpredictably)
// instead expose helper
const getCwd = () => repoDir;

module.exports = {
  originalCwd,
  repoDir,
  nonGitDir,
  getCwd
};

/**
 * shared runner to remove duplication
 */
function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "pipe",
    shell: os.platform() === "win32",
    ...opts
  });

  if (result.status !== 0) {
    throw new Error(
      `${cmd} failed with code ${result.status}\n` +
        `stdout: ${result.stdout?.toString() || ""}\n` +
        `stderr: ${result.stderr?.toString() || ""}`
    );
  }

  return result;
}

function ensureRepoExists() {
  const gitDir = path.join(repoDir, ".git");

  if (fs.existsSync(gitDir)) return;

  run(
    "git",
    ["clone", "--single-branch", "--branch", "test", "https://github.com/dimaslanjaka/test-repo.git", repoDir],
    {
      stdio: "inherit",
      shell: false
    }
  );
}

function ensureYarnProject() {
  const pkgJson = path.join(repoDir, "package.json");
  const yarnLock = path.join(repoDir, "yarn.lock");
  const yarnLockBak = path.join(repoDir, "yarn-lock.bak");

  const hasPkg = fs.existsSync(pkgJson);
  const hasLock = fs.existsSync(yarnLock);

  if (!hasPkg && !hasLock) {
    run("yarn", ["init", "-y"], { cwd: repoDir });
    return;
  }

  if (!hasPkg) return;

  const pkg = fs.readJSONSync(pkgJson);

  pkg.dependencies = {
    jquery: "^3.6.0",
    lodash: "^4.17.21"
  };

  pkg.devDependencies = {
    "binary-collections": "*"
  };

  fs.writeJSONSync(pkgJson, pkg, { spaces: 2 });

  if (!hasLock) {
    if (fs.existsSync(yarnLockBak)) {
      fs.renameSync(yarnLockBak, yarnLock);
    } else {
      fs.writeFileSync(yarnLock, "");
    }
  }
}

function installTarball(packageManager = "yarn") {
  const TGZ_PATH = path.resolve(__dirname, "../releases/bin.tgz");

  if (!fs.existsSync(TGZ_PATH)) {
    throw new Error(`tgz file not found: ${TGZ_PATH}. Run "yarn build" first.`);
  }

  const managers = {
    yarn: ["yarn", ["add", `binary-collections@file:${TGZ_PATH}`]],
    npm: ["npm", ["install", TGZ_PATH]]
  };

  const selected = managers[packageManager];

  if (!selected) {
    throw new Error(`Unsupported package manager: ${packageManager}`);
  }

  const [cmd, args] = selected;

  return run(cmd, args, { cwd: repoDir });
}

module.exports.ensureRepoExists = ensureRepoExists;
module.exports.ensureYarnProject = ensureYarnProject;
module.exports.installTarball = installTarball;
