import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'upath';
import os from 'os';
import { resolveNewestTarball } from '../../src/node-package-packer/build-tarball.mjs';

describe('resolveNewestTarball()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarball-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when no tarballs exist', () => {
    expect(resolveNewestTarball(tmpDir, ['package.tgz'])).toBeNull();
  });

  it('returns the named candidate if it exists', () => {
    const tarball = path.join(tmpDir, 'package.tgz');
    fs.writeFileSync(tarball, 'fake-tarball');

    const result = resolveNewestTarball(tmpDir, ['package.tgz']);
    expect(result).toBe(tarball);
  });

  it('returns the most recently modified .tgz file', () => {
    const oldTarball = path.join(tmpDir, 'old.tgz');
    const newTarball = path.join(tmpDir, 'new.tgz');
    fs.writeFileSync(oldTarball, 'old');
    fs.writeFileSync(newTarball, 'new');

    // Ensure newTarball is newer by adjusting mtime
    const now = Date.now();
    fs.utimesSync(oldTarball, new Date(now - 60000), new Date(now - 60000));
    fs.utimesSync(newTarball, new Date(now), new Date(now));

    const result = resolveNewestTarball(tmpDir, []);
    expect(result).toBe(newTarball);
  });
});
