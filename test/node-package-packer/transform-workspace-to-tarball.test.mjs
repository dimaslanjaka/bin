import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import fs from 'fs-extra';
import path from 'upath';
import { fileURLToPath } from 'url';
import { transformWorkspaceProtocols } from '../../src/node-package-packer/build-tarball.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function setWorkspaceDeps(pkgJsonPath, localPackageNames) {
  const pkg = fs.readJSONSync(pkgJsonPath);

  const targets = ['@dimaslanjaka/ai-toolkit', 'git-command-helper', 'cross-spawn'];

  const sections = ['dependencies', 'devDependencies'];

  let changed = false;

  for (const section of sections) {
    if (!pkg[section]) continue;

    for (const name of targets) {
      if (!pkg[section][name]) continue;

      // Only convert if the package exists in workspace
      if (!localPackageNames.includes(name)) continue;

      pkg[section][name] = 'workspace:^';
      changed = true;
    }
  }

  if (changed) {
    fs.writeJSONSync(pkgJsonPath, pkg, {
      spaces: 2,
      EOL: '\n'
    });
  }

  return changed;
}

describe("focus on dimaslanjaka's workspaces", () => {
  const rootDir = path.join(__dirname, '../..');
  const pkgJsonPath = path.resolve(rootDir, 'package.json');
  const pkgJsonBackupPath = path.resolve(rootDir, 'package-backup.json');

  let release;

  beforeAll(async () => {
    // Backup package.json
    fs.copyFileSync(pkgJsonPath, pkgJsonBackupPath);
    // modify @dimaslanjaka/ai-toolkit, git-command-helper, cross-spawn into workspace:^ on dependencies or devDependencies smarter
    setWorkspaceDeps(pkgJsonPath, ['@dimaslanjaka/ai-toolkit', 'git-command-helper', 'cross-spawn']);
    // transform workspace:^ protocol into tarball url
    release = await transformWorkspaceProtocols(rootDir);
  });

  afterAll(() => {
    release();
    // Restore backup
    fs.moveSync(pkgJsonBackupPath, pkgJsonPath, { overwrite: true });
  });

  it.each(['cross-spawn', 'git-command-helper', '@dimaslanjaka/ai-toolkit'])('%s should be a tarball URL', (pkgName) => {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    const version = pkg.dependencies?.[pkgName] ?? pkg.devDependencies?.[pkgName];
    expect(version).toMatch(/^https?:\/\/.+\.tgz$/);
  });
});
