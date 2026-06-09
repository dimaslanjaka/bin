import fs from 'fs-extra';
import path from 'upath';
import { getTempPath } from '../../src/binary-collections/config.cjs';
import { fileURLToPath } from 'url';
import { describe, it, expect, afterEach } from '@jest/globals';
import * as cp from 'cross-spawn';
import { bundle } from '../../src/node-package-packer/build-tarball.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = {
  repo: 'https://github.com/dimaslanjaka/ai-toolkit',
  pkgName: '@dimaslanjaka/ai-toolkit',
  path: getTempPath('node-package-packer/scoped-package')
};
const releaseDir = path.join(config.path, 'release');

describe('Scoped package packing', () => {
  beforeAll(() => {
    // Set up a temporary directory for the test
    fs.ensureDirSync(config.path);
    // Create a minimal package.json for packing
    fs.writeFileSync(
      path.join(config.path, 'package.json'),
      JSON.stringify(
        {
          name: config.pkgName,
          version: '1.0.0',
          main: 'index.js',
          files: ['index.js']
        },
        null,
        2
      )
    );
  });

  afterEach(() => {
    fs.emptyDirSync(releaseDir);
  });

  it('should pack a scoped package with Yarn', async () => {
    // Ensure yarn.lock exists for Yarn packing
    fs.writeFileSync(path.join(config.path, 'yarn.lock'), '');
    // Install dependencies
    cp.spawnSync('yarn', ['install'], { cwd: config.path, stdio: 'inherit' });
    // Pack the package using the build-tarball function
    await bundle({ _: ['-yarn'], cwd: config.path });

    expect(fs.existsSync(releaseDir)).toBe(true);
    const tarballs = fs.readdirSync(releaseDir).filter((file) => file.endsWith('.tgz'));
    expect(tarballs.length).toBeGreaterThan(0);
  });

  it('should pack a scoped package with custom filename', async () => {
    // Ensure yarn.lock exists for Yarn packing
    fs.writeFileSync(path.join(config.path, 'yarn.lock'), '');
    // Install dependencies
    cp.spawnSync('yarn', ['install'], { cwd: config.path, stdio: 'inherit' });
    // Pack the package using the build-tarball function
    await bundle({ _: ['-yarn'], cwd: config.path, filename: 'custom-package.tgz' });
    await bundle({ _: [], cwd: config.path, filename: 'without-ext' });

    const releaseDir = path.join(config.path, 'release');
    expect(fs.existsSync(releaseDir)).toBe(true);
    const tarballs = fs.readdirSync(releaseDir).filter((file) => file.endsWith('.tgz'));
    expect(tarballs.length).toBeGreaterThan(0);
    expect(tarballs).toContain('custom-package.tgz');
    expect(tarballs).toContain('without-ext.tgz');
  });
});
