// Environment setup
const { repoDir } = require("./env.cjs");
const { spawnSync } = require("child_process");
const fs = require("fs-extra");
const path = require("upath");
const { writefile } = require("sbg-utility");

const nodeModules = path.join(repoDir, "node_modules");
const pkgDir = path.join(nodeModules, "binary-collections");
const npmLockFile = path.join(repoDir, "package-lock.json");
const yarnLockFile = path.join(repoDir, "yarn.lock");
const npmLockFileBackup = npmLockFile + ".bak";
const yarnLockFileBackup = yarnLockFile + ".bak";
// Load bin keys from the main package.json
const mainPkg = require(path.resolve(__dirname, "../package.json"));
const binEntries = mainPkg.bin ? (typeof mainPkg.bin === "string" ? [mainPkg.bin] : Object.keys(mainPkg.bin)) : [];

jest.setTimeout(360000); // Set a longer timeout for tests

function prepareInstallation(type) {
  // Backup lock files if not already backed up
  [
    { file: npmLockFile, backup: npmLockFileBackup },
    { file: yarnLockFile, backup: yarnLockFileBackup }
  ].forEach(({ file, backup }) => {
    if (fs.existsSync(file) && !fs.existsSync(backup)) fs.renameSync(file, backup);
  });
  // Restore only the relevant lock file for the install type
  if (type === "yarn" && fs.existsSync(yarnLockFileBackup)) {
    fs.renameSync(yarnLockFileBackup, yarnLockFile);
  }
  if (type === "npm" && fs.existsSync(npmLockFileBackup)) {
    fs.renameSync(npmLockFileBackup, npmLockFile);
  }
  // Remove main directories
  ["binary-collections", ".bin"].forEach((dir) => {
    const target = path.join(nodeModules, dir);
    if (fs.existsSync(target)) fs.removeSync(target);
  });
}

function checkBinLinks(id, tarball) {
  const binDir = path.join(nodeModules, ".bin");
  const logFile = path.resolve(__dirname, `../tmp/binLinks${id}.txt`);
  const failedBins = [];
  const logLines = binEntries.map((binPath) => {
    const binName = path.basename(binPath);
    const binVariants = ["", ".cmd", ".ps1"].map((ext) => path.join(binDir, binName + ext));
    const foundVariant = binVariants.find((variant) => fs.existsSync(variant));
    if (!foundVariant) failedBins.push(binName);
    const binVariantsStr = binVariants.map((v) => `\t${v}\n\tExist: ${fs.existsSync(v)}`).join("\n");
    return `${binName}:\n${binVariantsStr}\nResult: ${foundVariant || "NOT FOUND"}`;
  });
  // Ensure tmp dir exists
  fs.ensureDirSync(path.dirname(logFile));
  writefile(logFile, `Tarball: ${tarball}\n\n${logLines.join("\n")}`);
  if (failedBins.length > 0) {
    throw new Error(`Missing bin links: ${failedBins.join(", ")}. See log: ${logFile}`);
  }
}

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

  describe(`should install binary-collections from tarball (${tarballPath}) using yarn`, () => {
    beforeAll(() => {
      prepareInstallation("yarn");
      // Create empty yarn.lock before running yarn add
      fs.writeFileSync(yarnLockFile, "");
      const result = spawnSync("yarn", ["add", `binary-collections@${tarballPath}`, "--mode=skip-build"], {
        cwd: repoDir,
        stdio: "pipe",
        shell: true
      });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`yarn add failed with code ${result.status}`);
      expect(fs.existsSync(pkgDir)).toBe(true);
      expect(fs.existsSync(path.join(pkgDir, "package.json"))).toBe(true);
      checkBinLinks("-yarn", tarballPath);
    });
    validateBinaries("yarn");
  });
});

function validateBinaries(packageManager) {
  const pkgJson = `${repoDir}/node_modules/binary-collections/package.json`;
  if (!fs.existsSync(pkgJson)) {
    throw new Error(`Package.json not found at ${pkgJson}`);
  }
  const pkg = require(pkgJson);
  [
    { cmd: "git-diff", args: ["--help"] },
    { cmd: "pkg-resolutions-updater", args: ["--help"] },
    { cmd: "submodule-install", args: ["--help"] }
  ].forEach(({ cmd, args }) => {
    it(`[${packageManager}] should run ${cmd} command`, () => {
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
