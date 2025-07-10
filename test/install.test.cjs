// Environment should on top of the file
const { repoDir } = require("./env");

// Import necessary modules
const { spawnSync } = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const { writefile } = require("sbg-utility");

describe("npm install binary-collections from remote tarball", () => {
  const nodeModules = path.join(repoDir, "node_modules");
  const pkgDir = path.join(nodeModules, "binary-collections");
  const tarballPaths = [
    "https://github.com/dimaslanjaka/bin/raw/master/releases/bin.tgz",
    path.resolve(__dirname, "../releases/bin.tgz")
  ];

  /** @type {string[]} */
  let binEntries = [];
  beforeAll(() => {
    // Clean up node_modules and package-lock.json if they exist
    if (fs.existsSync(nodeModules)) fs.removeSync(nodeModules);
    if (fs.existsSync(path.join(repoDir, "package-lock.json"))) fs.removeSync(path.join(repoDir, "package-lock.json"));
    if (fs.existsSync(path.join(repoDir, "yarn.lock"))) fs.removeSync(path.join(repoDir, "yarn.lock"));
    // Load bin keys from the main package.json
    const mainPkg = require(path.resolve(__dirname, "../package.json"));
    binEntries = mainPkg.bin ? (typeof mainPkg.bin === "string" ? [mainPkg.bin] : Object.keys(mainPkg.bin)) : [];

    // Initialize Node.js environment
    if (!fs.existsSync(path.join(repoDir, "package.json"))) {
      spawnSync("npm", ["init", "-y"], {
        cwd: repoDir,
        stdio: "inherit",
        shell: true
      });
    }
  });

  function prepareInstallation(type) {
    // Backup both lock files if they exist
    const pkgLock = path.join(repoDir, "package-lock.json");
    const yarnLock = path.join(repoDir, "yarn.lock");
    if (fs.existsSync(pkgLock) && !fs.existsSync(pkgLock + ".bak")) fs.renameSync(pkgLock, pkgLock + ".bak");
    if (fs.existsSync(yarnLock) && !fs.existsSync(yarnLock + ".bak")) fs.renameSync(yarnLock, yarnLock + ".bak");
    // Restore only the relevant lock file for the install type
    if (type === "yarn" && fs.existsSync(yarnLock + ".bak")) fs.renameSync(yarnLock + ".bak", yarnLock);
    if (type === "npm" && fs.existsSync(pkgLock + ".bak")) fs.renameSync(pkgLock + ".bak", pkgLock);
    // Remove main directories
    ["binary-collections", ".bin"].forEach((dir) => {
      const target = path.join(nodeModules, dir);
      if (fs.existsSync(target)) fs.removeSync(target);
    });
  }

  function checkBinLinks(id, tarball) {
    const binDir = path.join(nodeModules, ".bin");
    const logFile = path.resolve(__dirname, `../tmp/binLinks${id}.txt`);
    let failedBins = [];
    let logLines = binEntries.map(function (binPath) {
      const binName = path.basename(binPath);
      const binVariants = [
        path.join(binDir, binName),
        path.join(binDir, binName + ".cmd"),
        path.join(binDir, binName + ".ps1")
      ];
      const foundVariant = binVariants.find(function (variant) {
        return fs.existsSync(variant);
      });
      if (!foundVariant) failedBins.push(binName);
      const binVariantsStr = binVariants
        .map(function (v) {
          return "\t" + v + "\n\tExist: " + fs.existsSync(v);
        })
        .join("\n");
      return binName + ":\n" + binVariantsStr + "\nResult: " + (foundVariant ? foundVariant : "NOT FOUND");
    });
    // Ensure tmp dir exists
    const tmpDir = path.dirname(logFile);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    writefile(logFile, `Tarball: ${tarball}\n\n` + logLines.join("\n"));
    if (failedBins.length > 0) {
      throw new Error("Missing bin links: " + failedBins.join(", ") + ". See log: " + logFile);
    }
  }

  for (const tarballUrl of tarballPaths) {
    it(`should install binary-collections from tarball (${tarballUrl}) using npm`, () => {
      prepareInstallation("npm");
      const result = spawnSync("npm", ["install", "--ignore-scripts", `binary-collections@${tarballUrl}`], {
        cwd: repoDir,
        stdio: "pipe",
        shell: true
      });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`npm install failed with code ${result.status}`);
      expect(fs.existsSync(pkgDir)).toBe(true);
      expect(fs.existsSync(path.join(pkgDir, "package.json"))).toBe(true);
      checkBinLinks("-npm", tarballUrl);
    });

    it(`should install binary-collections from tarball (${tarballUrl}) using yarn`, () => {
      prepareInstallation("yarn");
      // Create empty yarn.lock before running yarn add
      const yarnLockPath = path.join(repoDir, "yarn.lock");
      fs.writeFileSync(yarnLockPath, "");
      const result = spawnSync("yarn", ["add", `binary-collections@${tarballUrl}`, "--mode=skip-build"], {
        cwd: repoDir,
        stdio: "pipe",
        shell: true
      });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`yarn add failed with code ${result.status}`);
      expect(fs.existsSync(pkgDir)).toBe(true);
      expect(fs.existsSync(path.join(pkgDir, "package.json"))).toBe(true);
      checkBinLinks("-yarn", tarballUrl);
    });
  }
});
