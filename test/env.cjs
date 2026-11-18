const path = require('upath');
const fs = require('fs-extra');
const { spawnSync } = require('child_process');
const os = require('os');
const dotenv = require('dotenv');
const { ensureCloned } = require('../src/git/ensureCloned.cjs');

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true, quiet: true });
}

const originalCwd = path.resolve(__dirname, '..');
const repoDir = path.join(__dirname, '../tmp/test-repo');
const nonGitDir = path.join(os.tmpdir(), 'non-git-dir');

fs.ensureDirSync(nonGitDir);

/**
 * Get the repo directory path used as a working directory for tests.
 * Does NOT modify the global process.cwd.
 *
 * @returns {string} The absolute path to the test repo directory.
 */
const getCwd = () => repoDir;

module.exports = {
  originalCwd,
  repoDir,
  nonGitDir,
  getCwd
};

/**
 * Run a command synchronously with spawnSync and throw on non-zero exit.
 * Shares common spawn options across test helpers to reduce duplication.
 *
 * @param {string} cmd - The command to execute.
 * @param {string[]} args - Arguments to pass to the command.
 * @param {import('child_process').SpawnSyncOptions} [opts={}] - Additional spawn options merged over defaults.
 * @returns {import('child_process').SpawnSyncReturns} The result from spawnSync.
 * @throws {Error} If the command exits with a non-zero status code.
 */
function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'pipe',
    shell: os.platform() === 'win32',
    ...opts
  });

  if (result.status !== 0) {
    throw new Error(
      `${cmd} failed with code ${result.status}\n` +
        `stdout: ${result.stdout?.toString() || ''}\n` +
        `stderr: ${result.stderr?.toString() || ''}`
    );
  }

  return result;
}

/**
 * Ensure the test repository exists at `repoDir`, cloning it if absent.
 * Uses the `test` branch of the dimaslanjaka/test-repo GitHub repository.
 * Delegates to ensureCloned which also verifies remote URL, branch, and git root.
 */
function ensureRepoExists() {
  ensureCloned('https://github.com/dimaslanjaka/test-repo.git', 'test', repoDir);
}

/**
 * Ensure the test repo is set up as a yarn project with known dependencies.
 * Initialises a package.json, adds `jquery`/`lodash` as dependencies and
 * `binary-collections` as a devDependency, and creates or renames the lockfile.
 */
function ensureYarnProject() {
  const pkgJson = path.join(repoDir, 'package.json');
  const yarnLock = path.join(repoDir, 'yarn.lock');
  const yarnLockBak = path.join(repoDir, 'yarn-lock.bak');

  const hasPkg = fs.existsSync(pkgJson);
  const hasLock = fs.existsSync(yarnLock);

  if (!hasPkg && !hasLock) {
    run('yarn', ['init', '-y'], { cwd: repoDir });
    return;
  }

  if (!hasPkg) return;

  const pkg = fs.readJSONSync(pkgJson);

  pkg.dependencies = {
    jquery: '^3.6.0',
    lodash: '^4.17.21'
  };

  pkg.devDependencies = {
    'binary-collections': '*'
  };

  fs.writeJSONSync(pkgJson, pkg, { spaces: 2 });

  if (!hasLock) {
    if (fs.existsSync(yarnLockBak)) {
      fs.renameSync(yarnLockBak, yarnLock);
    } else {
      fs.writeFileSync(yarnLock, '');
    }
  }
}

/**
 * Install the local `binary-collections` tarball into the test repo.
 * Supports yarn and npm package managers.
 *
 * @param {'yarn'|'npm'} [packageManager='yarn'] - The package manager to use for installation.
 * @returns {import('child_process').SpawnSyncReturns} The result from the install command.
 * @throws {Error} If the tarball is missing at the expected path or an unsupported package manager is given.
 */
function installTarball(packageManager = 'yarn') {
  const TGZ_PATH = path.resolve(__dirname, '../releases/bin.tgz');

  if (!fs.existsSync(TGZ_PATH)) {
    throw new Error(`tgz file not found: ${TGZ_PATH}. Run "yarn build" first.`);
  }

  const managers = {
    yarn: ['yarn', ['add', `binary-collections@file:${TGZ_PATH}`]],
    npm: ['npm', ['install', TGZ_PATH]]
  };

  const selected = managers[packageManager];

  if (!selected) {
    throw new Error(`Unsupported package manager: ${packageManager}`);
  }

  const [cmd, args] = selected;

  return run(cmd, args, { cwd: repoDir });
}

const repoRoot = path.resolve(__dirname, '..');

/**
 * Reuse an existing test project by rewriting package.json and resetting git.
 * If the project doesn't exist yet, it will be initialized first.
 */
function makeProject({ pkg = { name: 'fixture', version: '1.0.0' }, config = null, tests = {} } = {}) {
  // Reuse the existing test repo directory
  const testDir = path.join(repoRoot, 'tmp', 'test-repo');

  // Ensure the test repo exists and is a yarn project
  ensureRepoExists();
  ensureYarnProject();

  // Reset to clean committed state and remove untracked files from previous run
  spawnSync('git', ['reset', '--hard', 'HEAD'], { cwd: testDir });
  spawnSync('git', ['clean', '-fd'], { cwd: testDir });

  // Rewrite package.json with the provided pkg
  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');

  // Rewrite config if provided
  const configBody = config ? `export default ${JSON.stringify(config, null, 2)};\n` : 'export default {};\n';
  fs.writeFileSync(path.join(testDir, 'binary-collections.config.mjs'), configBody, 'utf8');

  // Write test files
  for (const [rel, body] of Object.entries(tests)) {
    const abs = path.join(testDir, rel);
    fs.ensureDirSync(path.dirname(abs));
    fs.writeFileSync(abs, body, 'utf8');
  }

  // Note: git add is intentionally left to the test caller
  // This allows tests to control which files are tracked (important for skipUntracked behavior)

  return testDir;
}

module.exports.ensureRepoExists = ensureRepoExists;
module.exports.ensureYarnProject = ensureYarnProject;
module.exports.installTarball = installTarball;
module.exports.makeProject = makeProject;
