import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'upath';
import os from 'os';
import { resolveWorkspaceVersions } from '../../src/node-package-packer/transform-workspace-protocols.mjs';

describe('resolveWorkspaceVersions()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-versions-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolves versions from workspace packages/*', () => {
    // Create root package.json with workspace patterns
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), {
      name: 'test-monorepo',
      workspaces: ['packages/*']
    });

    // Create two workspace packages
    fs.mkdirpSync(path.join(tmpDir, 'packages', 'pkg-a'));
    fs.writeJsonSync(path.join(tmpDir, 'packages', 'pkg-a', 'package.json'), {
      name: 'pkg-a',
      version: '2.1.0'
    });

    fs.mkdirpSync(path.join(tmpDir, 'packages', 'pkg-b'));
    fs.writeJsonSync(path.join(tmpDir, 'packages', 'pkg-b', 'package.json'), {
      name: '@scope/pkg-b',
      version: '3.0.0-beta'
    });

    const result = resolveWorkspaceVersions(tmpDir);
    expect(result).toEqual({
      'pkg-a': '2.1.0',
      '@scope/pkg-b': '3.0.0-beta'
    });
  });

  it('returns empty object when no workspaces configured', () => {
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), {
      name: 'test-no-ws'
    });

    expect(resolveWorkspaceVersions(tmpDir)).toEqual({});
  });

  it('skips workspace dirs without package.json', () => {
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), {
      name: 'test-monorepo',
      workspaces: ['packages/*']
    });

    fs.mkdirpSync(path.join(tmpDir, 'packages', 'empty-dir'));
    // No package.json inside empty-dir

    expect(resolveWorkspaceVersions(tmpDir)).toEqual({});
  });

  it('skips workspace packages missing name or version', () => {
    fs.writeJsonSync(path.join(tmpDir, 'package.json'), {
      name: 'test-monorepo',
      workspaces: ['packages/*']
    });

    fs.mkdirpSync(path.join(tmpDir, 'packages', 'no-version'));
    fs.writeJsonSync(path.join(tmpDir, 'packages', 'no-version', 'package.json'), {
      name: 'no-version-pkg'
      // no version field
    });

    const result = resolveWorkspaceVersions(tmpDir);
    expect(result).toEqual({});
  });
});
