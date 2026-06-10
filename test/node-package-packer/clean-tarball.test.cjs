const fs = require('fs-extra');
const path = require('upath');
const tar = require('tar');

const { cleanTarball } = require('../../src/node-package-packer/clean-tarball.cjs');
const { getTempPath } = require('../../src/binary-collections/config.cjs');

/**
 * Create a directory structure for the test tarball with:
 * - valid entries (index.js, README.md)
 * - workspace artifact entries (release/, releases/, .yarn/releases/)
 * - non-artifact entries for onFilter testing (node_modules/)
 */
function createSourceStructure(targetDir) {
  // Valid package entries
  fs.mkdirpSync(path.join(targetDir, 'package'));
  fs.writeFileSync(path.join(targetDir, 'package', 'index.js'), 'module.exports = {};');
  fs.writeFileSync(path.join(targetDir, 'package', 'README.md'), '# Test Package');

  // Workspace artifact: packages/<name>/release/*.tgz
  const releaseDir = path.join(targetDir, 'package', 'packages', 'sub-pkg', 'release');
  fs.mkdirpSync(releaseDir);
  fs.writeFileSync(path.join(releaseDir, 'sub-pkg.tgz'), 'artifact-release');

  // Workspace artifact: packages/<name>/releases/*.tgz
  const releasesDir = path.join(targetDir, 'package', 'packages', 'sub-pkg', 'releases');
  fs.mkdirpSync(releasesDir);
  fs.writeFileSync(path.join(releasesDir, 'sub-pkg.tgz'), 'artifact-releases');

  // Workspace artifact: packages/<name>/.yarn/releases/*.cjs
  const yarnReleasesDir = path.join(targetDir, 'package', 'packages', 'sub-pkg', '.yarn', 'releases');
  fs.mkdirpSync(yarnReleasesDir);
  fs.writeFileSync(path.join(yarnReleasesDir, 'yarn-3.cjs'), 'artifact-yarn');

  // Non-artifact entry for onFilter testing (does not match artifact patterns)
  const nodeModulesDir = path.join(targetDir, 'package', 'node_modules', 'dep');
  fs.mkdirpSync(nodeModulesDir);
  fs.writeFileSync(path.join(nodeModulesDir, 'index.js'), 'module.exports = {};');
}

/**
 * Collect all file paths recursively under a directory, relative to it.
 * Returns sorted array of forward-slash paths.
 */
function collectAllPaths(dir) {
  const entries = [];
  if (!fs.existsSync(dir)) return entries;

  function walk(current, relative) {
    const children = fs.readdirSync(current);
    for (const child of children) {
      const full = path.join(current, child);
      const rel = relative ? path.join(relative, child) : child;
      if (fs.statSync(full).isDirectory()) {
        walk(full, rel);
      } else {
        entries.push(rel);
      }
    }
  }

  walk(dir, '');
  return entries.sort();
}

/** Helper: create a tarball from a source directory */
async function createTarball(sourceDir, tarballPath) {
  const entries = fs.readdirSync(sourceDir);
  await tar.create({ file: tarballPath, gzip: true, cwd: sourceDir, portable: true }, entries);
}

/** Helper: extract a tarball to a destination directory */
async function extractTarball(tarballPath, destDir) {
  fs.mkdirpSync(destDir);
  await tar.extract({ file: tarballPath, cwd: destDir });
}

describe('cleanTarball', () => {
  /** @type {string} */
  let rootDir;
  /** @type {string} Path to a template tarball with artifact entries */
  let templateTarball;

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    rootDir = fs.mkdtempSync(path.join(getTempPath(), 'clean-tarball-'));

    // Create source directory with artifacts
    const srcDir = path.join(rootDir, 'src');
    createSourceStructure(srcDir);

    // Pack into the template tarball
    templateTarball = path.join(rootDir, 'template.tgz');
    await createTarball(srcDir, templateTarball);
  });

  afterAll(() => {
    jest.restoreAllMocks();
    fs.removeSync(rootDir);
  });

  // -------------------------------------------------------------------------
  // Artifact removal
  // -------------------------------------------------------------------------

  test('removes workspace artifact entries (release/, releases/, .yarn/releases/)', async () => {
    const tarball = path.join(rootDir, 'test-artifact-removal.tgz');
    fs.copyFileSync(templateTarball, tarball);

    await cleanTarball(tarball);

    const extractDir = path.join(rootDir, 'extract-artifact-removal');
    await extractTarball(tarball, extractDir);
    const entries = collectAllPaths(extractDir);

    // Valid entries survive
    expect(entries).toContain(path.join('package', 'index.js'));
    expect(entries).toContain(path.join('package', 'README.md'));

    // Artifact entries removed
    expect(entries).not.toContain(path.join('package', 'packages', 'sub-pkg', 'release', 'sub-pkg.tgz'));
    expect(entries).not.toContain(path.join('package', 'packages', 'sub-pkg', 'releases', 'sub-pkg.tgz'));
    expect(entries).not.toContain(path.join('package', 'packages', 'sub-pkg', '.yarn', 'releases', 'yarn-3.cjs'));

    // node_modules survives (not an artifact)
    expect(entries).toContain(path.join('package', 'node_modules', 'dep', 'index.js'));
  });

  test('does not modify a tarball without any artifact entries', async () => {
    // Create a clean tarball (no artifacts)
    const cleanSrc = path.join(rootDir, 'clean-src');
    fs.mkdirpSync(path.join(cleanSrc, 'package'));
    fs.writeFileSync(path.join(cleanSrc, 'package', 'index.js'), 'content');

    const tarball = path.join(rootDir, 'test-no-artifacts.tgz');
    await createTarball(cleanSrc, tarball);

    await cleanTarball(tarball);

    // Tarball should still be valid
    const extractDir = path.join(rootDir, 'extract-no-artifacts');
    await extractTarball(tarball, extractDir);
    const entries = collectAllPaths(extractDir);
    expect(entries).toContain(path.join('package', 'index.js'));

    fs.removeSync(cleanSrc);
  });

  test('returns silently when tarball does not exist', async () => {
    const missingPath = path.join(rootDir, 'nonexistent.tgz');
    await expect(cleanTarball(missingPath)).resolves.toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // onFilter callback
  // -------------------------------------------------------------------------

  test('onFilter() excludes entries returning false', async () => {
    const tarball = path.join(rootDir, 'test-filter.tgz');
    fs.copyFileSync(templateTarball, tarball);

    const filterFn = jest.fn((entryPath) => {
      if (entryPath.includes('node_modules')) return false;
      return true;
    });

    await cleanTarball(tarball, { onFilter: filterFn });

    expect(filterFn).toHaveBeenCalled();

    const extractDir = path.join(rootDir, 'extract-filter');
    await extractTarball(tarball, extractDir);
    const entries = collectAllPaths(extractDir);

    // node_modules should be excluded by onFilter
    expect(entries).not.toContain(path.join('package', 'node_modules', 'dep', 'index.js'));
    // Valid entries remain
    expect(entries).toContain(path.join('package', 'index.js'));
    expect(entries).toContain(path.join('package', 'README.md'));
    // Artifacts still removed (built-in check runs first)
    expect(entries).not.toContain(path.join('package', 'packages', 'sub-pkg', 'release', 'sub-pkg.tgz'));
  });

  test('onFilter() is not called for entries already filtered by artifact check', async () => {
    const tarball = path.join(rootDir, 'test-filter-not-called.tgz');
    fs.copyFileSync(templateTarball, tarball);

    const filterFn = jest.fn(() => true);

    await cleanTarball(tarball, { onFilter: filterFn });

    // onFilter should NOT be called with entries that match the built-in
    // artifact patterns (file entries inside release/, releases/, .yarn/releases/).
    // Directory entries (.yarn/ itself) pass the built-in check and DO reach
    // onFilter — that's expected because they aren't workspace artifacts.
    // Use forward-slash paths since tar normalizes entry paths.
    const artifactFileEntries = [
      'package/packages/sub-pkg/release/sub-pkg.tgz',
      'package/packages/sub-pkg/releases/sub-pkg.tgz',
      'package/packages/sub-pkg/.yarn/releases/yarn-3.cjs'
    ];

    for (const call of filterFn.mock.calls) {
      const entryPath = call[0];
      for (const artifact of artifactFileEntries) {
        expect(entryPath).not.toBe(artifact);
      }
    }
  });

  // -------------------------------------------------------------------------
  // onFinish callback
  // -------------------------------------------------------------------------

  test('onFinish() sync callback is called with tarball path', async () => {
    const tarball = path.join(rootDir, 'test-finish-sync.tgz');
    fs.copyFileSync(templateTarball, tarball);

    const onFinish = jest.fn();

    await cleanTarball(tarball, { onFinish });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(tarball);
  });

  test('onFinish() async callback is awaited', async () => {
    const tarball = path.join(rootDir, 'test-finish-async.tgz');
    fs.copyFileSync(templateTarball, tarball);

    let completed = false;
    const onFinish = async () => {
      await new Promise((r) => setTimeout(r, 50));
      completed = true;
    };

    await cleanTarball(tarball, { onFinish });

    // If onFinish was properly awaited, completed should be true
    expect(completed).toBe(true);
  });

  test('onFinish() is called even when no entries are removed', async () => {
    // Create a clean tarball (no artifacts to remove)
    const cleanSrc = path.join(rootDir, 'finish-clean-src');
    fs.mkdirpSync(path.join(cleanSrc, 'lib'));
    fs.writeFileSync(path.join(cleanSrc, 'lib', 'index.js'), 'module.exports = {};');

    const tarball = path.join(rootDir, 'test-finish-clean.tgz');
    await createTarball(cleanSrc, tarball);

    const onFinish = jest.fn();

    await cleanTarball(tarball, { onFinish });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(tarball);

    fs.removeSync(cleanSrc);
  });
});
