import { afterAll, describe, expect, jest, test } from '@jest/globals';
import fs from 'fs-extra';
import path from 'upath';

import { getTempPath, makeTempDir } from '../../src/binary-collections/config.cjs';
import { normalizeResolutions, restoreResolutions } from '../../src/node-package-packer/normalize-resolutions.mjs';

const BACKUP_BASENAME = 'test-package-1.0.0.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Write a package.json into `dir` with given overrides. */
function writePackageJson(dir, overrides = {}) {
  const pkg = {
    name: 'test-package',
    version: '1.0.0',
    ...overrides
  };
  fs.writeJsonSync(path.join(dir, 'package.json'), pkg, { spaces: 2 });
}

/** Read package.json from `dir`. */
function readPackageJson(dir) {
  return fs.readJsonSync(path.join(dir, 'package.json'));
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const RESOLUTIONS_WITH_HASHES = {
  'cross-spawn':
    'https://github.com/dimaslanjaka/node-cross-spawn/raw/e48db3235351bbcb9394b21766b2d477cc6b7dd2/release/cross-spawn.tgz',
  'git-command-helper':
    'https://github.com/dimaslanjaka/git-command-helper/raw/4e7f8475eafa0974c170893de354026967a71776/release/git-command-helper.tgz',
  '@types/through2':
    'https://github.com/dimaslanjaka/nodejs-package-types/raw/refs/heads/through2/release/types-through2.tgz',
  'unrelated-pkg': 'https://github.com/other/other/raw/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/release/other.tgz'
};

const RESOLUTIONS_NORMALIZED = {
  'cross-spawn': 'https://github.com/dimaslanjaka/node-cross-spawn/raw/private/release/cross-spawn.tgz',
  'git-command-helper':
    'https://github.com/dimaslanjaka/git-command-helper/raw/pre-release/release/git-command-helper.tgz',
  '@types/through2':
    'https://github.com/dimaslanjaka/nodejs-package-types/raw/refs/heads/through2/release/types-through2.tgz',
  'unrelated-pkg': 'https://github.com/other/other/raw/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/release/other.tgz'
};

// ---------------------------------------------------------------------------
// normalizeResolutions
// ---------------------------------------------------------------------------

describe('normalizeResolutions()', () => {
  /** @type {string[]} collect temp dirs for cleanup */
  const tmpDirs = [];

  afterAll(() => {
    // Clean up any backup files left in the shared temp dir
    const sharedBackup = getTempPath('normalize-resolutions', BACKUP_BASENAME);
    if (fs.existsSync(sharedBackup)) {
      fs.removeSync(sharedBackup);
    }
    for (const d of tmpDirs) {
      fs.rmSync(d, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  test('normalizes matching commit hashes to branch names', async () => {
    const dir = makeTempDir({ prefix: 'norm-res-' });
    tmpDirs.push(dir);
    writePackageJson(dir, { resolutions: { ...RESOLUTIONS_WITH_HASHES } });

    await normalizeResolutions(dir);

    expect(readPackageJson(dir).resolutions).toEqual(RESOLUTIONS_NORMALIZED);
  });

  test('leaves non-matching packages unchanged', async () => {
    const dir = makeTempDir({ prefix: 'norm-res-' });
    tmpDirs.push(dir);
    writePackageJson(dir, {
      resolutions: {
        '@types/through2': RESOLUTIONS_WITH_HASHES['@types/through2'],
        'unrelated-pkg': RESOLUTIONS_WITH_HASHES['unrelated-pkg']
      }
    });

    await normalizeResolutions(dir);

    const pkg = readPackageJson(dir);
    // Neither is in DEFAULT_RESOLUTIONS_NORMALIZE
    expect(pkg.resolutions['@types/through2']).toBe(RESOLUTIONS_WITH_HASHES['@types/through2']);
    expect(pkg.resolutions['unrelated-pkg']).toBe(RESOLUTIONS_WITH_HASHES['unrelated-pkg']);
  });

  test('creates a backup file when changes are made', async () => {
    const dir = makeTempDir({ prefix: 'norm-res-' });
    tmpDirs.push(dir);
    writePackageJson(dir, { resolutions: { ...RESOLUTIONS_WITH_HASHES } });

    await normalizeResolutions(dir);

    const backupPath = getTempPath('normalize-resolutions', BACKUP_BASENAME);
    expect(fs.existsSync(backupPath)).toBe(true);

    const backup = fs.readJsonSync(backupPath);
    expect(backup.resolutions).toEqual(RESOLUTIONS_WITH_HASHES);
  });

  test('does nothing when there are no resolutions', async () => {
    const dir = makeTempDir({ prefix: 'norm-res-' });
    tmpDirs.push(dir);
    writePackageJson(dir);

    await normalizeResolutions(dir);

    expect(readPackageJson(dir).resolutions).toBeUndefined();
  });

  test('handles empty resolutions object', async () => {
    const dir = makeTempDir({ prefix: 'norm-res-' });
    tmpDirs.push(dir);
    writePackageJson(dir, { resolutions: {} });

    await normalizeResolutions(dir);

    expect(readPackageJson(dir).resolutions).toEqual({});
  });

  test('cleans up backup when no changes are needed', async () => {
    const dir = makeTempDir({ prefix: 'norm-res-' });
    tmpDirs.push(dir);
    // URLs without hashes — nothing to normalize
    writePackageJson(dir, {
      resolutions: {
        'cross-spawn': 'https://example.com/cross-spawn/release/cross-spawn.tgz',
        'git-command-helper': 'https://example.com/git-helper/release/git-command-helper.tgz'
      }
    });

    await normalizeResolutions(dir);

    // Backup file should be removed
    const backupPath = getTempPath('normalize-resolutions', BACKUP_BASENAME);
    expect(fs.existsSync(backupPath)).toBe(false);
  });

  test('uses defaults from DEFAULT_RESOLUTIONS_NORMALIZE when no config file exists', async () => {
    const dir = makeTempDir({ prefix: 'norm-res-' });
    tmpDirs.push(dir);
    // sbg-utility is in defaults → should be normalized
    writePackageJson(dir, {
      resolutions: {
        'sbg-utility':
          'https://github.com/dimaslanjaka/static-blog-generator/raw/1ca385787f7287155b547c5b97d5ffd5bcfab482/packages/sbg-utility/release/sbg-utility.tgz'
      }
    });

    await normalizeResolutions(dir);

    const pkg = readPackageJson(dir);
    expect(pkg.resolutions['sbg-utility']).toBe(
      'https://github.com/dimaslanjaka/static-blog-generator/raw/sbg-utility/packages/sbg-utility/release/sbg-utility.tgz'
    );
  });
});

// ---------------------------------------------------------------------------
// restoreResolutions
// ---------------------------------------------------------------------------

describe('restoreResolutions()', () => {
  /** @type {string[]} collect temp dirs for cleanup */
  const tmpDirs = [];

  afterEach(() => {
    // Clean up shared backup after each test to avoid cross-test pollution
    const sharedBackup = getTempPath('normalize-resolutions', BACKUP_BASENAME);
    if (fs.existsSync(sharedBackup)) {
      fs.removeSync(sharedBackup);
    }
  });

  afterAll(() => {
    for (const d of tmpDirs) {
      fs.rmSync(d, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  test('restores original package.json and removes backup', async () => {
    const dir = makeTempDir({ prefix: 'norm-res-' });
    tmpDirs.push(dir);
    writePackageJson(dir, { resolutions: { ...RESOLUTIONS_WITH_HASHES } });

    // Normalize first to create backup
    await normalizeResolutions(dir);

    const backupPath = getTempPath('normalize-resolutions', BACKUP_BASENAME);
    expect(fs.existsSync(backupPath)).toBe(true);

    // Now restore
    restoreResolutions(dir);

    // Original content restored
    const restored = readPackageJson(dir);
    expect(restored.resolutions).toEqual(RESOLUTIONS_WITH_HASHES);
    // Backup removed
    expect(fs.existsSync(backupPath)).toBe(false);
  });

  test('handles empty backup gracefully', async () => {
    const dir = makeTempDir({ prefix: 'norm-res-' });
    tmpDirs.push(dir);
    writePackageJson(dir, { resolutions: { ...RESOLUTIONS_WITH_HASHES } });

    // Manually create an empty backup at the expected getTempPath location
    const backupPath = getTempPath('normalize-resolutions', BACKUP_BASENAME);
    fs.ensureDirSync(path.dirname(backupPath));
    fs.writeFileSync(backupPath, '');

    // Should log and return without crashing
    restoreResolutions(dir);

    // package.json should be untouched
    expect(readPackageJson(dir).resolutions).toEqual(RESOLUTIONS_WITH_HASHES);
  });

  test('calls process.exit(1) when no backup exists', () => {
    // Mock process.exit to throw so execution halts (like the real thing)
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const dir = makeTempDir({ prefix: 'norm-res-' });
    tmpDirs.push(dir);
    writePackageJson(dir);

    expect(() => restoreResolutions(dir)).toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledWith(
      '[normalize-resolutions] no backup found at',
      expect.stringContaining('normalize-resolutions')
    );

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
