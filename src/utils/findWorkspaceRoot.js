import { Configuration, Project } from '@yarnpkg/core';
import path from 'upath';
import fs from 'fs-extra';

export async function findWorkspaceRootYC(cwd = process.cwd()) {
  const configuration = await Configuration.find(cwd, null);
  const { project } = await Project.find(configuration, cwd);

  return project.cwd;
}

/**
 * Find Yarn workspace root directory.
 *
 * @param {string} cwd
 * @returns {string|null}
 */
export function findYarnWorkspaceRootFS(cwd = process.cwd()) {
  let current = path.resolve(cwd);

  while (true) {
    const pkgPath = path.join(current, 'package.json');

    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

        if (
          pkg.workspaces ||
          fs.existsSync(path.join(current, 'yarn.lock')) ||
          fs.existsSync(path.join(current, '.yarn'))
        ) {
          return current;
        }
      } catch {
        // ignore invalid package.json
      }
    }

    const parent = path.dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export { findYarnWorkspaceRootFS as findWorkspaceRoot };
