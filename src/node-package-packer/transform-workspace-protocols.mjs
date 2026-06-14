import fs from 'fs-extra';
import path from 'upath';
import * as glob from 'glob';
import { getWorkspacesInfo } from './get-workspaces.cjs';
import { getGithubRawUrl } from 'git-command-helper';

/**
 * Build a map of workspace package name → version from the monorepo workspaces.
 * @param {string} dirname Repository root directory.
 * @returns {Record<string, string>}
 */
function resolveWorkspaceVersions(dirname) {
  const rootPkg = fs.readJsonSync(path.join(dirname, 'package.json'));
  const workspacePatterns = rootPkg.workspaces || [];
  const versionMap = {};

  for (const pattern of workspacePatterns) {
    const matches = glob.globSync(pattern, { cwd: dirname, absolute: true });
    for (const wsDir of matches) {
      const wsPkgPath = path.join(wsDir, 'package.json');
      if (fs.existsSync(wsPkgPath)) {
        try {
          const wsPkg = fs.readJsonSync(wsPkgPath);
          if (wsPkg.name && wsPkg.version) {
            versionMap[wsPkg.name] = wsPkg.version;
          }
        } catch {
          // skip invalid package.json
        }
      }
    }
  }

  return versionMap;
}

/**
 * Transform workspace protocol references in package.json dependency fields.
 * Yarn uses `workspace:*`, `workspace:^`, `workspace:~` to reference sibling
 * workspace packages. These must be replaced with real version ranges before
 * running `npm pack` or `yarn pack` to avoid "Workspace not found" errors.
 *
 * Creates a backup at `.package.json.bak` and writes the transformed file.
 * Returns a restore function to undo the changes.
 *
 * @param {string} dirname Repository root directory.
 * @returns {Promise<() => void>} Restore function to revert package.json.
 */
export async function transformWorkspaceProtocols(dirname) {
  const pkgPath = path.join(dirname, 'package.json');
  const original = await fs.readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(original);
  const versionMap = resolveWorkspaceVersions(dirname);
  const workspaceDepFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  let modified = false;

  const info = await getWorkspacesInfo(process.cwd(), { absolutePaths: false });
  const workspaces = info.workspaces.map((i) => {
    return {
      path: i.path,
      name: i.name
    };
  });

  for (const field of workspaceDepFields) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, version] of Object.entries(deps)) {
      if (typeof version !== 'string') continue;

      const match = version.match(/^workspace:(.+)$/);
      if (!match) continue;

      // check if package in local workspace
      if (workspaces.length > 0) {
        const find = workspaces.find((w) => w.name === name);
        if (find) {
          const isGit = fs.existsSync(path.join(find.path, '.git')) || fs.existsSync(path.join(process.cwd(), '.git'));
          if (isGit) {
            // whenever git folder (root or workspace), get github raw url of release(s)/${name}.tgz
            const tarballPath = [
              path.join(find.path, 'releases', `${name}.tgz`),
              path.join(find.path, 'release', `${name}.tgz`)
            ].filter(fs.existsSync)[0];
            if (tarballPath) {
              console.log('found tarball', tarballPath);
              try {
                // get tarball github raw url
                const rawUrl = await getGithubRawUrl(tarballPath);
                deps[name] = rawUrl;
                modified = true;
                console.log(`[info] transformed "${name}" from "${version}" to "${rawUrl}"`);
                continue;
              } catch (err) {
                console.warn(
                  `[warn] failed to resolve GitHub URL for "${name}" tarball, falling back to version range`,
                  err
                );
              }
            }
          }
        }
      }

      const wsProtocol = match[1]; // e.g. "*" or "^" or "~"
      const actualVersion = versionMap[name];

      if (!actualVersion) {
        console.warn(`[warn] workspace package "${name}" not found, keeping "${version}"`);
        continue;
      }

      let replacement;
      if (wsProtocol === '*') {
        replacement = actualVersion;
      } else if (wsProtocol === '^') {
        replacement = `^${actualVersion}`;
      } else if (wsProtocol === '~') {
        replacement = `~${actualVersion}`;
      } else {
        // custom semver range after workspace: (e.g. workspace:1.2.3)
        replacement = wsProtocol;
      }

      deps[name] = replacement;
      modified = true;
      console.log(`[info] transformed "${name}" from "${version}" to "${replacement}"`);
    }
  }

  if (!modified) {
    // no changes needed, return noop restore
    console.log('[transform-workspace] no workspace: references found');
    return () => {};
  }

  // Write backup
  const bakPath = path.join(dirname, '.package.json.bak');
  await fs.writeFile(bakPath, original, 'utf-8');

  // Write transformed
  await fs.writeJson(pkgPath, pkg, { spaces: 2, EOL: '\n' });

  return () => {
    if (fs.existsSync(bakPath)) {
      fs.copyFileSync(bakPath, pkgPath);
      fs.rmSync(bakPath, { force: true });
    }
  };
}

export { resolveWorkspaceVersions };
