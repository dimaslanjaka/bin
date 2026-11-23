const { repoDir } = require('./env.cjs');
const { spawnSync } = require('child_process');
const fs = require('fs-extra');
const path = require('upath');
const {
  forceRemoveSync,
  prepareInstallation,
  nodeModules,
  checkBinLinks,
  validateBinaries
} = require('./validate-tarball-utils.cjs');

const pkgDir = path.join(nodeModules, 'binary-collections');

jest.setTimeout(360000); // Set a longer timeout for tests

/**
 * Detect the installed npm major version (cached).
 * Returns 0 if the version cannot be determined.
 * @param {string} cwd
 * @returns {number}
 */
let cachedNpmMajor;
function getNpmMajor(cwd) {
  if (cachedNpmMajor !== undefined) return cachedNpmMajor;
  const res = spawnSync('npm', ['--version'], {
    cwd,
    encoding: 'utf8',
    shell: true
  });
  const major = parseInt(
    String(res.stdout || '')
      .trim()
      .split('.')[0],
    10
  );
  cachedNpmMajor = Number.isNaN(major) ? 0 : major;
  return cachedNpmMajor;
}

/**
 * Build `npm install` arguments.
 * Adds --allow-remote=all only on npm >= 12 (where the default became "none").
 * Older npm versions would warn about an unknown config, so we skip it there.
 * @param {string} cwd
 * @param {...string} extraArgs
 * @returns {string[]}
 */
function npmInstallArgs(cwd, ...extraArgs) {
  const flags = ['--ignore-scripts'];
  if (getNpmMajor(cwd) >= 12) {
    flags.push('--allow-remote=all');
  }
  return ['install', ...flags, ...extraArgs];
}

describe('Test binary-collections tarball', () => {
  const workspaceDir = path.resolve(__dirname, '../');
  const tarballPath = path.resolve(workspaceDir, 'releases/bin.tgz');

  beforeAll(() => {
    // Clean up node_modules and lock files if they exist
    for (const dir of [pkgDir]) {
      forceRemoveSync(dir);
    }
    // Build the workspace and create the tarball to install
    // buildAndPack(workspaceDir);
    // Prepare environment
    prepareInstallation('npm');
  });

  it(`should install binary-collections from tarball (${tarballPath}) using npm`, () => {
    // Install the packaged tarball into the test project
    const result = spawnSync('npm', npmInstallArgs(repoDir, `file:${tarballPath}`), {
      cwd: repoDir,
      stdio: 'pipe',
      shell: true
    });
    if (result.error) {
      console.log(
        `NPM install failed with error:\n${result.error}\n${result.stdout.toString()}\n${result.stderr.toString()}`
      );
    }
    if (result.status !== 0) {
      console.log(`NPM install failed with output:\n${result.stdout.toString()}\n${result.stderr.toString()}`);
    }
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(fs.existsSync(pkgDir)).toBe(true);
    expect(fs.existsSync(path.join(pkgDir, 'package.json'))).toBe(true);
    checkBinLinks('-npm', tarballPath);
  });

  // Shared checks for expected binaries
  validateBinaries('npm');
});
