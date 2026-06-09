import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'upath';
import os from 'os';
import { transformWorkspaceProtocols } from '../../src/node-package-packer/transform-workspace-protocols.mjs';

describe('transformWorkspaceProtocols()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-transform-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /**
   * Set up a minimal monorepo with two workspace packages.
   * Returns the root package.json object for further modification.
   */
  function setupWorkspaces(extraWorkspacePkgs = []) {
    // Workspace packages
    const wsPkgs = [
      { dir: 'pkg-a', name: 'pkg-a', version: '1.0.0' },
      { dir: 'pkg-b', name: '@scope/pkg-b', version: '2.5.0' },
      ...extraWorkspacePkgs
    ];

    for (const ws of wsPkgs) {
      fs.mkdirpSync(path.join(tmpDir, 'packages', ws.dir));
      fs.writeJsonSync(path.join(tmpDir, 'packages', ws.dir, 'package.json'), {
        name: ws.name,
        version: ws.version
      });
    }

    const rootPkg = {
      name: 'test-monorepo',
      version: '0.0.0',
      workspaces: ['packages/*'],
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
      optionalDependencies: {}
    };

    return rootPkg;
  }

  it('transforms workspace:^ to ^version', async () => {
    const rootPkg = setupWorkspaces();
    rootPkg.dependencies['pkg-a'] = 'workspace:^';
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), rootPkg);

    const restore = await transformWorkspaceProtocols(tmpDir);

    const updated = fs.readJsonSync(path.join(tmpDir, 'package.json'));
    expect(updated.dependencies['pkg-a']).toBe('^1.0.0');

    restore();
  });

  it('transforms workspace:* to plain version', async () => {
    const rootPkg = setupWorkspaces();
    rootPkg.dependencies['pkg-a'] = 'workspace:*';
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), rootPkg);

    const restore = await transformWorkspaceProtocols(tmpDir);

    const updated = fs.readJsonSync(path.join(tmpDir, 'package.json'));
    expect(updated.dependencies['pkg-a']).toBe('1.0.0');

    restore();
  });

  it('transforms workspace:~ to ~version', async () => {
    const rootPkg = setupWorkspaces();
    rootPkg.dependencies['pkg-a'] = 'workspace:~';
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), rootPkg);

    const restore = await transformWorkspaceProtocols(tmpDir);

    const updated = fs.readJsonSync(path.join(tmpDir, 'package.json'));
    expect(updated.dependencies['pkg-a']).toBe('~1.0.0');

    restore();
  });

  it('transforms custom semver after workspace: prefix', async () => {
    const rootPkg = setupWorkspaces();
    rootPkg.dependencies['pkg-a'] = 'workspace:1.2.3';
    // pkg-a has version 1.0.0, but custom semver after workspace: should be used as-is
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), rootPkg);

    const restore = await transformWorkspaceProtocols(tmpDir);

    const updated = fs.readJsonSync(path.join(tmpDir, 'package.json'));
    // Custom semver passes through directly
    expect(updated.dependencies['pkg-a']).toBe('1.2.3');

    restore();
  });

  it('handles all four dependency fields', async () => {
    const rootPkg = setupWorkspaces([{ dir: 'pkg-c', name: 'pkg-c', version: '3.0.0' }]);
    rootPkg.dependencies['pkg-a'] = 'workspace:^';
    rootPkg.devDependencies['@scope/pkg-b'] = 'workspace:*';
    rootPkg.peerDependencies['pkg-c'] = 'workspace:~';
    rootPkg.optionalDependencies['pkg-a'] = 'workspace:*';
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), rootPkg);

    const restore = await transformWorkspaceProtocols(tmpDir);

    const updated = fs.readJsonSync(path.join(tmpDir, 'package.json'));
    expect(updated.dependencies['pkg-a']).toBe('^1.0.0');
    expect(updated.devDependencies['@scope/pkg-b']).toBe('2.5.0');
    expect(updated.peerDependencies['pkg-c']).toBe('~3.0.0');
    expect(updated.optionalDependencies['pkg-a']).toBe('1.0.0');

    restore();
  });

  it('does not modify non-workspace dependencies', async () => {
    const rootPkg = setupWorkspaces();
    rootPkg.dependencies['express'] = '^4.18.0';
    rootPkg.dependencies['lodash'] = '4.17.21';
    rootPkg.devDependencies['jest'] = '^29.0.0';
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), rootPkg);

    const restore = await transformWorkspaceProtocols(tmpDir);

    const updated = fs.readJsonSync(path.join(tmpDir, 'package.json'));
    expect(updated.dependencies['express']).toBe('^4.18.0');
    expect(updated.dependencies['lodash']).toBe('4.17.21');
    expect(updated.devDependencies['jest']).toBe('^29.0.0');

    restore();
  });

  it('leaves unknown workspace names unchanged with a warning', async () => {
    const rootPkg = setupWorkspaces();
    rootPkg.dependencies['unknown-ws'] = 'workspace:^';
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), rootPkg);

    const restore = await transformWorkspaceProtocols(tmpDir);

    const updated = fs.readJsonSync(path.join(tmpDir, 'package.json'));
    expect(updated.dependencies['unknown-ws']).toBe('workspace:^');

    restore();
  });

  it('returns noop restore when nothing is modified', async () => {
    const rootPkg = setupWorkspaces();
    rootPkg.dependencies['express'] = '^4.18.0';
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), rootPkg);

    const restore = await transformWorkspaceProtocols(tmpDir);
    expect(typeof restore).toBe('function');

    // Calling noop should not throw
    expect(() => restore()).not.toThrow();
  });

  it('creates .package.json.bak backup file', async () => {
    const rootPkg = setupWorkspaces();
    rootPkg.dependencies['pkg-a'] = 'workspace:^';
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), rootPkg);

    const restore = await transformWorkspaceProtocols(tmpDir);

    const bakPath = path.join(tmpDir, '.package.json.bak');
    expect(fs.existsSync(bakPath)).toBe(true);

    const bak = JSON.parse(fs.readFileSync(bakPath, 'utf-8'));
    expect(bak.dependencies['pkg-a']).toBe('workspace:^');

    restore();
  });

  it('restores original after calling restore', async () => {
    const rootPkg = setupWorkspaces();
    rootPkg.dependencies['pkg-a'] = 'workspace:^';
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), rootPkg);

    const restore = await transformWorkspaceProtocols(tmpDir);

    // Verify transformed
    const transformed = fs.readJsonSync(path.join(tmpDir, 'package.json'));
    expect(transformed.dependencies['pkg-a']).toBe('^1.0.0');

    // Restore
    restore();

    // Verify restored
    const restored = fs.readJsonSync(path.join(tmpDir, 'package.json'));
    expect(restored.dependencies['pkg-a']).toBe('workspace:^');

    // Backup file should be removed
    expect(fs.existsSync(path.join(tmpDir, '.package.json.bak'))).toBe(false);
  });

  it('does not modify dependencies without workspace: prefix', async () => {
    const rootPkg = setupWorkspaces();
    rootPkg.dependencies['pkg-a'] = 'workspace:^';
    // pkg-c is not in workspaces but has a normal dep
    rootPkg.dependencies['pkg-c'] = 'npm:^1.0.0';
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), rootPkg);

    const restore = await transformWorkspaceProtocols(tmpDir);

    const updated = fs.readJsonSync(path.join(tmpDir, 'package.json'));
    // pkg-a is workspace, pkg-c is not
    expect(updated.dependencies['pkg-a']).toBe('^1.0.0');
    expect(updated.dependencies['pkg-c']).toBe('npm:^1.0.0');

    restore();
  });
});
