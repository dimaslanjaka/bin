/**
 * Utility functions for validate-tarball tests.
 */
const { repoDir } = require("./env.cjs");
const path = require("upath");
const fs = require("fs-extra");
const { writefile } = require("sbg-utility");

// Define lock file paths used by the original implementation
const npmLockFile = path.join(repoDir, "package-lock.json");
const yarnLockFile = path.join(repoDir, "yarn.lock");
const npmLockFileBackup = npmLockFile + ".bak";
const yarnLockFileBackup = yarnLockFile + ".bak";
const nodeModules = path.join(repoDir, "node_modules");

// Load bin keys from the main package.json (used by checkBinLinks)
const mainPkg = require(path.resolve(__dirname, "../package.json"));
const binEntries = mainPkg.bin ? (typeof mainPkg.bin === "string" ? [mainPkg.bin] : Object.keys(mainPkg.bin)) : [];

/**
 * Prepare the installation environment for a given package manager.
 * Mirrors the original implementation from validate-tarball.test.cjs.
 *
 * @param {string} type - "npm" or "yarn"
 */
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

/**
 * Verify that all expected bin links exist after installation.
 * Mirrors the original implementation from validate-tarball.test.cjs.
 *
 * @param {string} id - Identifier used for naming the log file.
 * @param {string} tarball - Path to the tarball being tested.
 */
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

module.exports = {
  prepareInstallation,
  npmLockFile,
  yarnLockFile,
  npmLockFileBackup,
  yarnLockFileBackup,
  nodeModules,
  checkBinLinks,
  binEntries
};
