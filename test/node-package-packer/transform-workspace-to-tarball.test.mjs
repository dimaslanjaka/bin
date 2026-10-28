import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { spawnSync } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'upath';
import { fileURLToPath } from 'url';
import { transformWorkspaceProtocols } from '../../src/node-package-packer/build-tarball.mjs';
import { ensureCloned } from '../../src/git/ensureCloned.cjs';
import { ensureRepoExists, repoDir } from '../env.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Write a workspace package.json into `projectDir` with:
 *  - workspaces: ["packages/*"]
 *  - workspace:^ references for git-command-helper and cross-spawn
 * @param {string} projectDir
 */
function writeProjectPackageJson(projectDir) {
  const pkg = {
    name: 'test-workspace-project',
    version: '1.0.0',
    private: true,
    workspaces: ['packages/*'],
    dependencies: {
      'git-command-helper': 'workspace:^',
      'cross-spawn': 'workspace:^'
    }
  };

  fs.writeJSONSync(path.join(projectDir, 'package.json'), pkg, { spaces: 2, EOL: '\n' });
}

describe("focus on dimaslanjaka's workspaces", () => {
  const projectDir = repoDir;
  const pkgJsonPath = path.join(projectDir, 'package.json');
  const pkgJsonBackupPath = path.join(projectDir, 'package-backup.json');

  let release;

  // Ensure repoDir is a cloned git repo before any nested setup runs
  beforeAll(() => {
    ensureRepoExists();
  }, 120_000);

  // Discard any uncommitted changes left in repoDir after all tests finish
  afterAll(() => {
    spawnSync('git', ['reset', '--hard'], {
      cwd: projectDir,
      stdio: 'inherit',
      shell: os.platform() === 'win32'
    });
  });

  describe('workspace protocol transform', () => {
    beforeAll(async () => {
      // 1. Clone packages matching .gitmodules entries into projectDir/packages/
      ensureCloned(
        'https://github.com/dimaslanjaka/git-command-helper',
        'pre-release',
        path.join(projectDir, 'packages', 'git-command-helper')
      );
      ensureCloned(
        'https://github.com/dimaslanjaka/node-cross-spawn.git',
        'private',
        path.join(projectDir, 'packages', 'cross-spawn')
      );

      // 2. Write package.json with workspace:^ deps for both packages
      writeProjectPackageJson(projectDir);

      // 3. Back up then transform workspace:^ -> tarball URLs
      fs.copyFileSync(pkgJsonPath, pkgJsonBackupPath);
      release = await transformWorkspaceProtocols(projectDir);
    }, 120_000);

    afterAll(() => {
      if (typeof release === 'function') release();
      if (fs.existsSync(pkgJsonBackupPath)) {
        fs.moveSync(pkgJsonBackupPath, pkgJsonPath, { overwrite: true });
      }
    });

    it.each(['cross-spawn', 'git-command-helper'])('%s should be a tarball URL', (pkgName) => {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      const version = pkg.dependencies?.[pkgName] ?? pkg.devDependencies?.[pkgName];
      expect(version).toMatch(/^https?:\/\/.+\.tgz$/);
    });
  });
});
