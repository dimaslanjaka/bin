const { repoDir } = require("./env.cjs");
const { spawnSync } = require("child_process");
const fs = require("fs-extra");
const path = require("upath");
const {
  prepareInstallation,
  npmLockFile,
  yarnLockFile,
  npmLockFileBackup,
  yarnLockFileBackup,
  nodeModules,
  checkBinLinks,
  buildAndPack,
  validateBinaries
} = require("./validate-tarball-utils.cjs");

const pkgDir = path.join(nodeModules, "binary-collections");

jest.setTimeout(360000); // Set a longer timeout for tests

// Function moved to utils file; imported above.

describe("Test binary-collections tarball", () => {
  const workspaceDir = path.resolve(__dirname, "../");
  const tarballPath = path.resolve(workspaceDir, "releases/bin.tgz");

  beforeAll(() => {
    // Clean up node_modules and lock files if they exist
    for (const dir of [pkgDir]) {
      if (fs.existsSync(dir)) fs.removeSync(dir);
    }
    for (const { file, backup } of [
      { file: npmLockFile, backup: npmLockFileBackup },
      { file: yarnLockFile, backup: yarnLockFileBackup }
    ]) {
      if (fs.existsSync(file)) fs.moveSync(file, backup, { overwrite: true });
    }
    // Build the workspace and create the tarball to install
    buildAndPack(workspaceDir);
    // Prepare environment
    prepareInstallation("yarn");
  });

  it(`should install binary-collections from tarball (${tarballPath}) using yarn`, () => {
    // Create empty yarn.lock (yarn may require a lockfile to operate predictably)
    fs.writeFileSync(yarnLockFile, "");
    // Install the packaged tarball via yarn
    const result = spawnSync("yarn", ["add", `binary-collections@${tarballPath}`, "--mode=skip-build"], {
      cwd: repoDir,
      stdio: "pipe",
      shell: true
    });
    if (result.error) {
      console.log(
        `Yarn add failed with error:\n${result.error}\n${result.stdout.toString()}\n${result.stderr.toString()}`
      );
    }
    if (result.status !== 0) {
      console.log(`Yarn add failed with output:\n${result.stdout.toString()}\n${result.stderr.toString()}`);
    }
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(fs.existsSync(pkgDir)).toBe(true);
    expect(fs.existsSync(path.join(pkgDir, "package.json"))).toBe(true);
    checkBinLinks("-yarn", tarballPath);
  });

  // Shared checks for expected binaries
  validateBinaries("yarn");
});
