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
  checkBinLinks
} = require("./validate-tarball-utils.cjs");

const pkgDir = path.join(nodeModules, "binary-collections");

jest.setTimeout(360000); // Set a longer timeout for tests

// Function moved to utils file; imported above.

describe("Test binary-collections tarball", () => {
  const workspaceDir = path.resolve(__dirname, "../");
  const tarballPath = path.resolve(workspaceDir, "releases/bin.tgz");

  beforeAll(() => {
    // Clean up node_modules and lock files if they exist
    [pkgDir].forEach((dir) => fs.existsSync(dir) && fs.removeSync(dir));
    [
      { file: npmLockFile, backup: npmLockFileBackup },
      { file: yarnLockFile, backup: yarnLockFileBackup }
    ].forEach(({ file, backup }) => {
      if (fs.existsSync(file)) fs.moveSync(file, backup);
    });
    // Initialize Node.js environment if needed
    const pkgJson = path.join(repoDir, "package.json");
    if (!fs.existsSync(pkgJson)) {
      spawnSync("npm", ["init", "-y"], {
        cwd: repoDir,
        stdio: "ignore",
        shell: true
      });
    }
  });

  describe(`should install binary-collections from tarball (${tarballPath}) using npm`, () => {
    beforeAll(() => {
      prepareInstallation("npm");
      const result = spawnSync("npm", ["install", "--ignore-scripts", `binary-collections@${tarballPath}`], {
        cwd: repoDir,
        stdio: "pipe",
        shell: true
      });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`npm install failed with code ${result.status}`);
      expect(fs.existsSync(pkgDir)).toBe(true);
      expect(fs.existsSync(path.join(pkgDir, "package.json"))).toBe(true);
      checkBinLinks("-npm", tarballPath);
    });
    validateBinaries("npm");
  });
});

function validateBinaries(packageManager) {
  const pkgJson = `${repoDir}/node_modules/binary-collections/package.json`;
  [
    { cmd: "git-diff", args: ["--help"] },
    { cmd: "pkg-resolutions-updater", args: ["--help"] },
    { cmd: "submodule-install", args: ["--help"] },
    { cmd: "kill-night-crows", args: ["--help"] }
  ].forEach(({ cmd, args }) => {
    it(`[${packageManager}] should run ${cmd} command`, () => {
      if (!fs.existsSync(pkgJson)) {
        throw new Error(`Package.json not found at ${pkgJson}`);
      }
      const pkg = require(pkgJson);

      expect(pkg).toHaveProperty("bin");
      expect(pkg.bin).toHaveProperty(cmd);
      expect(typeof pkg.bin[cmd]).toBe("string");

      const actualBinPath = path.resolve(repoDir, "node_modules/binary-collections", pkg.bin[cmd]);
      expect(fs.existsSync(actualBinPath)).toBe(true);

      const result = spawnSync("node", [actualBinPath, ...args], {
        cwd: repoDir,
        stdio: "pipe",
        shell: true
      });
      if (result.status !== 0) {
        console.log(result);
      }
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);

      // Proxy (binary-collections commandName)
      const proxyPath = path.resolve(repoDir, "node_modules/binary-collections/lib/binary-collections.cjs");
      expect(fs.existsSync(proxyPath)).toBe(true);
      const resultProxy = spawnSync("node", [proxyPath, cmd, ...args], {
        cwd: repoDir,
        stdio: "pipe",
        shell: true
      });
      expect(resultProxy.error).toBeUndefined();
      expect(resultProxy.status).toBe(0);
    });
  });
}
