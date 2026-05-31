/**
 * Utility functions for validate-tarball tests.
 */
const { repoDir, ensureRepoExists } = require('./env.cjs');
const CryptoJS = require('crypto-js');
const { globSync } = require('glob');
const path = require('upath');
const fs = require('fs-extra');
const { writefile } = require('sbg-utility');

// Define lock file paths used by the original implementation
const npmLockFile = path.join(repoDir, 'package-lock.json');
const yarnLockFile = path.join(repoDir, 'yarn.lock');
const npmLockFileBackup = npmLockFile + '.bak';
const yarnLockFileBackup = yarnLockFile + '.bak';
const nodeModules = path.join(repoDir, 'node_modules');

// Load bin keys from the main package.json (used by checkBinLinks)
const mainPkg = require(path.resolve(__dirname, '../package.json'));
const binEntries = mainPkg.bin ? (typeof mainPkg.bin === 'string' ? [mainPkg.bin] : Object.keys(mainPkg.bin)) : [];

const { spawnSync, execSync } = require('child_process');

/**
 * Path to the checksum cache file used to skip rebuilds when nothing changed.
 */
const CHECKSUM_CACHE_FILE = path.resolve(__dirname, '../tmp/.buildAndPack-checksum');

/**
 * Compute a composite checksum from:
 * - current git short hash
 * - contents of releases/*.tgz files
 * - contents of src/**\/*.{js,ts,cjs,mjs} files
 *
 * @param {string} cwd - workspace directory
 * @returns {string} hex sha-256 digest
 */
function computeBuildChecksum(cwd) {
  const hash = CryptoJS.algo.SHA256.create();

  // 1. Git short hash
  try {
    const gitHash = execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf8' }).trim();
    hash.update('git:' + gitHash);
  } catch {
    // If git is unavailable, force a rebuild by making checksum unpredictable
    hash.update('git:unknown:' + Date.now());
  }

  // 2. releases/*.tgz files — binary content, preserve bytes via Latin1
  const tgzFiles = globSync('releases/*.tgz', { cwd, nodir: true }).sort();
  for (const file of tgzFiles) {
    const absPath = path.resolve(cwd, file);
    if (fs.existsSync(absPath)) {
      hash.update('tgz:' + file);
      hash.update(CryptoJS.enc.Latin1.parse(fs.readFileSync(absPath, 'latin1')));
    }
  }

  // 3. src/**/*.{js,ts,cjs,mjs} files — text content, UTF-8
  const srcFiles = globSync('src/**/*.{js,ts,cjs,mjs}', { cwd, nodir: true }).sort();
  for (const file of srcFiles) {
    const absPath = path.resolve(cwd, file);
    if (fs.existsSync(absPath)) {
      hash.update('src:' + file);
      hash.update(fs.readFileSync(absPath, 'utf8'));
    }
  }

  return hash.finalize().toString(CryptoJS.enc.Hex);
}

/**
 * Run `yarn build` and `yarn run pack` in the workspace directory.
 * Keeps output quiet but throws on failure.
 *
 * Skips both steps when a cached checksum shows nothing has changed
 * (same git hash, same tarballs, same source files).
 *
 * @param {string} workspaceDir
 */
function buildAndPack(workspaceDir) {
  // ---- checksum guard --------------------------------------------------
  const currentChecksum = computeBuildChecksum(workspaceDir);

  let previousChecksum = null;
  if (fs.existsSync(CHECKSUM_CACHE_FILE)) {
    previousChecksum = fs.readFileSync(CHECKSUM_CACHE_FILE, 'utf8').trim();
  }

  if (previousChecksum === currentChecksum) {
    console.log('[buildAndPack] checksum unchanged — skipping build & pack');
    return;
  }

  if (previousChecksum !== null) {
    console.log('[buildAndPack] checksum changed — rebuilding');
  }
  // ---- end checksum guard ----------------------------------------------
  // Build
  const build = spawnSync('yarn', ['build'], { cwd: workspaceDir, stdio: 'pipe', shell: true });
  if (build.error || build.status !== 0) {
    const out = (build.stdout || Buffer.from('')).toString();
    const err = (build.stderr || Buffer.from('')).toString();
    throw new Error(`yarn build failed:\n${out}\n${err}`);
  }

  // Pack
  const pack = spawnSync('yarn', ['run', 'pack'], { cwd: workspaceDir, stdio: 'pipe', shell: true });
  if (pack.error || pack.status !== 0) {
    const out = (pack.stdout || Buffer.from('')).toString();
    const err = (pack.stderr || Buffer.from('')).toString();
    throw new Error(`yarn run pack failed:\n${out}\n${err}`);
  }

  // Save checksum only after both build and pack succeed
  fs.ensureDirSync(path.dirname(CHECKSUM_CACHE_FILE));
  fs.writeFileSync(CHECKSUM_CACHE_FILE, currentChecksum);
}
/**
 * Prepare the installation environment for a given package manager.
 * Mirrors the original implementation from validate-tarball.test.cjs.
 *
 * @param {string} type - "npm" or "yarn"
 */
function prepareInstallation(type) {
  ensureRepoExists();

  // Backup lock files if not already backed up
  for (const { file, backup } of [
    { file: npmLockFile, backup: npmLockFileBackup },
    { file: yarnLockFile, backup: yarnLockFileBackup }
  ]) {
    if (fs.existsSync(file) && !fs.existsSync(backup)) fs.renameSync(file, backup);
  }

  // Restore only the relevant lock file for the install type
  if (type === 'yarn' && fs.existsSync(yarnLockFileBackup)) {
    fs.renameSync(yarnLockFileBackup, yarnLockFile);
  }
  if (type === 'npm' && fs.existsSync(npmLockFileBackup)) {
    fs.renameSync(npmLockFileBackup, npmLockFile);
  }

  // Remove binary-collections and .bin from node_modules to ensure a clean slate for installation
  for (const dir of ['binary-collections', '.bin']) {
    const target = path.join(nodeModules, dir);
    if (fs.existsSync(target)) fs.removeSync(target);
    expect(fs.existsSync(target)).toBe(false);
  }

  // Ensure the test project has a package.json (initialize if missing)
  const pkgJson = path.join(repoDir, 'package.json');
  if (!fs.existsSync(pkgJson)) {
    spawnSync('npm', ['init', '-y'], { cwd: repoDir, stdio: 'ignore', shell: true });
  }

  const pkgObj = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
  const projectObj = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  pkgObj.resolutions = Object.assign(pkgObj.resolutions || {}, projectObj.resolutions);
  pkgObj.dependencies = {};
  pkgObj.devDependencies = {
    'binary-collections': `file:${path.resolve(__dirname, '../releases/bin.tgz')}`
  };
  fs.writeFileSync(pkgJson, JSON.stringify(pkgObj, null, 2));
}

/**
 * Verify that all expected bin links exist after installation.
 * Mirrors the original implementation from validate-tarball.test.cjs.
 *
 * @param {string} id - Identifier used for naming the log file.
 * @param {string} tarball - Path to the tarball being tested.
 */
function checkBinLinks(id, tarball) {
  const binDir = path.join(nodeModules, '.bin');
  const logFile = path.resolve(__dirname, `../tmp/binLinks${id}.txt`);
  const failedBins = [];
  const logLines = binEntries.map((binPath) => {
    const binName = path.basename(binPath);
    const binVariants = ['', '.cmd', '.ps1'].map((ext) => path.join(binDir, binName + ext));
    const foundVariant = binVariants.find((variant) => fs.existsSync(variant));
    if (!foundVariant) failedBins.push(binName);
    const binVariantsStr = binVariants.map((v) => `\t${v}\n\tExist: ${fs.existsSync(v)}`).join('\n');
    return `${binName}:\n${binVariantsStr}\nResult: ${foundVariant || 'NOT FOUND'}`;
  });
  // Ensure tmp dir exists
  fs.ensureDirSync(path.dirname(logFile));
  writefile(logFile, `Tarball: ${tarball}\n\n${logLines.join('\n')}`);
  if (failedBins.length > 0) {
    throw new Error(`Missing bin links: ${failedBins.join(', ')}. See log: ${logFile}`);
  }
}

/**
 * Validate that installed package exposes the expected `bin` entries and
 * that running both the direct script and the `binary-collections` proxy
 * works for each named command.
 *
 * @param {string} packageManager - human friendly name like "npm" or "yarn"
 */
function validateBinaries(packageManager) {
  const pkgJson = `${repoDir}/node_modules/binary-collections/package.json`;
  const checks = [
    { cmd: 'git-diff', args: ['--help'] },
    { cmd: 'pkg-resolutions-updater', args: ['--help'] },
    { cmd: 'submodule-install', args: ['--help'] },
    { cmd: 'kill-night-crows', args: ['--help'] }
  ];

  for (const { cmd, args } of checks) {
    it(`[${packageManager}] should run ${cmd} command`, () => {
      if (!fs.existsSync(pkgJson)) {
        throw new Error(`Package.json not found at ${pkgJson}`);
      }
      const pkg = require(pkgJson);

      expect(pkg).toHaveProperty('bin');
      expect(pkg.bin).toHaveProperty(cmd);
      expect(typeof pkg.bin[cmd]).toBe('string');

      const actualBinPath = path.resolve(repoDir, 'node_modules/binary-collections', pkg.bin[cmd]);
      expect(fs.existsSync(actualBinPath)).toBe(true);

      const result = spawnSync('node', [actualBinPath, ...args], {
        cwd: repoDir,
        stdio: 'pipe',
        shell: true
      });
      if (result.status !== 0) {
        console.log(result);
      }
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);

      // Proxy (binary-collections commandName)
      const proxyPath = path.resolve(repoDir, 'node_modules/binary-collections/lib/binary-collections.cjs');
      expect(fs.existsSync(proxyPath)).toBe(true);
      const resultProxy = spawnSync('node', [proxyPath, cmd, ...args], {
        cwd: repoDir,
        stdio: 'pipe',
        shell: true
      });
      expect(resultProxy.error).toBeUndefined();
      expect(resultProxy.status).toBe(0);
    });
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
  binEntries,
  buildAndPack,
  validateBinaries
};
