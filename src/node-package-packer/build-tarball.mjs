import fs from 'fs-extra';
import { file_to_hash } from 'sbg-utility';
import path from 'upath';
import buildReadme from './build-readme.mjs';
import { getArgs } from '../utils/index.cjs';
import * as crossSpawn from 'cross-spawn';
import { globSync } from 'glob';
import { getWorkspacesInfo } from './get-workspaces.cjs';
import { getGithubRawUrl } from 'git-command-helper';

function slugifyPkgName(str) {
  return str.replace(/\//g, '-').replace(/@/g, '');
}

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
    const matches = globSync(pattern, { cwd: dirname, absolute: true });
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
async function transformWorkspaceProtocols(dirname) {
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

function resolveNewestTarball(dirname, candidateNames) {
  const candidates = new Set();

  for (const name of candidateNames) {
    const candidatePath = path.join(dirname, name);
    if (fs.existsSync(candidatePath)) {
      candidates.add(candidatePath);
    }
  }

  for (const entry of fs.readdirSync(dirname)) {
    if (entry.endsWith('.tgz')) {
      candidates.add(path.join(dirname, entry));
    }
  }

  const tarballs = Array.from(candidates);
  if (tarballs.length === 0) {
    return null;
  }

  return tarballs.sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)[0];
}

export async function getPackageHashes(dirname, releaseDir) {
  let hashes = {};
  const metafile = path.join(releaseDir, 'metadata.json');
  if (fs.existsSync(metafile)) {
    try {
      hashes = Object.assign(
        hashes,
        Object.fromEntries(
          Object.entries(JSON.parse(fs.readFileSync(metafile, 'utf-8'))).filter(
            ([key]) => !key.endsWith('yarn.lock') && !key.endsWith('package-lock.json')
          )
        )
      );
    } catch {
      hashes = {};
    }
  }

  const readDir = fs
    .readdirSync(releaseDir)
    .filter((f) => f.endsWith('tgz'))
    .map((f) => path.join(releaseDir, f));

  for (let i = 0; i < readDir.length; i++) {
    const file = readDir[i];
    const stat = fs.statSync(file);
    const size = `${parseFloat(stat.size / Math.pow(1024, 1)).toFixed(2)} KB`;
    hashes = Object.assign({}, hashes, {
      [path.toUnix(file).replace(path.toUnix(dirname), '')]: {
        integrity: {
          sha1: await file_to_hash('sha1', file),
          sha256: await file_to_hash('sha256', file, 'base64'),
          md5: await file_to_hash('md5', file),
          sha512: await file_to_hash('sha512', file, 'base64')
        },
        size
      }
    });

    fs.writeFileSync(metafile, JSON.stringify(hashes, null, 2) + '\n');
  }

  return hashes;
}

/**
 * Build release tarballs using the Yarn pack output.
 * @param {string} dirname Repository root directory.
 * @param {object} packagejson Parsed package.json content.
 * @param {string} releaseDir Release output directory.
 * @param {object} argv Parsed CLI arguments.
 * @param {boolean} withFilename Whether to keep the requested filename variant.
 * @param {boolean} isCI Whether the process is running in CI.
 * @returns {Promise<void>}
 */
export async function bundleWithYarn(dirname, packagejson, releaseDir, argv, withFilename, isCI) {
  await buildReadme(dirname, packagejson, releaseDir, argv, isCI);

  const targetFname =
    argv['fn'] || argv['filename'] || slugifyPkgName(`${packagejson.name}-${packagejson.version}.tgz`);
  const tgz = resolveNewestTarball(dirname, [
    'package.tgz',
    slugifyPkgName(`${packagejson.name}-v${packagejson.version}.tgz`)
  ]);

  if (!tgz) {
    throw new Error(`No Yarn pack tarball found in ${dirname}`);
  }

  if (withFilename) {
    const tgzlatest = path.join(releaseDir, targetFname + '.tgz');
    fs.copySync(tgz, tgzlatest, { overwrite: true });
  } else {
    const tgzlatest = path.join(releaseDir, slugifyPkgName(`${packagejson.name}.tgz`));
    const tgzversion = path.join(releaseDir, targetFname);

    fs.copySync(tgz, tgzlatest, { overwrite: true });
    fs.copySync(tgz, tgzversion, { overwrite: true });
  }

  fs.rmSync(tgz, { recursive: true, force: true });

  await getPackageHashes(dirname, releaseDir);
}

/**
 * Build release tarballs using the npm pack output.
 * @param {string} dirname Repository root directory.
 * @param {object} packagejson Parsed package.json content.
 * @param {string} releaseDir Release output directory.
 * @param {object} argv Parsed CLI arguments.
 * @param {boolean} isCI Whether the process is running in CI.
 * @returns {Promise<void>}
 */
export async function bundleWithNpm(dirname, packagejson, releaseDir, argv, isCI) {
  const filename = slugifyPkgName(`${packagejson.name}-${packagejson.version}.tgz`);
  const tgz = path.join(dirname, filename);
  const tgzversion = path.join(releaseDir, filename);

  if (!fs.existsSync(tgz)) {
    const filename2 = slugifyPkgName(`${packagejson.name}-${packagejson.version}.tgz`);
    const origintgz = path.join(dirname, filename2);
    if (fs.existsSync(origintgz) && origintgz !== tgz) {
      fs.renameSync(origintgz, tgz);
    }
  }
  const tgzlatest = path.join(releaseDir, slugifyPkgName(`${packagejson.name}.tgz`));

  if (!fs.existsSync(path.dirname(tgzlatest))) {
    fs.mkdirpSync(path.dirname(tgzlatest));
  }

  await buildReadme(dirname, packagejson, releaseDir, argv, isCI);

  if (fs.existsSync(tgz)) {
    fs.copySync(tgz, tgzlatest);
    fs.copySync(tgz, tgzversion);
    if (fs.existsSync(tgz)) fs.rmSync(tgz);

    await getPackageHashes(dirname, releaseDir);
  }
}

/**
 * Resolve CLI context and run the pack workflow.
 * @returns {Promise<void>}
 */
export async function bundle(customArgs = {}) {
  const args = Object.assign(customArgs, getArgs());
  const withYarn = args.yarn || args._.includes('-yarn') || args._.includes('--yarn');
  const releaseDir1 = path.join(process.cwd(), 'release');
  const releaseDir2 = path.join(process.cwd(), 'releases');
  const releaseDir = !fs.existsSync(releaseDir2) ? releaseDir1 : releaseDir2;
  const isYarn = fs.existsSync(path.join(process.cwd(), 'yarn.lock')) || withYarn;
  const packagejson = fs.readJSONSync(path.join(process.cwd(), 'package.json'));
  const withFilename = args['fn'] || args['filename'] ? true : false;
  /**
   * is current device is Github Actions
   */
  const isCI = process.env.GITHUB_ACTION && process.env.GITHUB_ACTIONS;

  // create released directory when not exist
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirpSync(releaseDir, { recursive: true });
  }

  // Transform workspace protocol references (workspace:^, workspace:*, workspace:~)
  // to real version ranges before packing, then restore after.
  const restorePkg = await transformWorkspaceProtocols(process.cwd());

  try {
    const result = crossSpawn.sync(withYarn ? 'yarn' : 'npm', ['pack'], {
      cwd: process.cwd(),
      stdio: 'ignore',
      env: { PATH: process.env.PATH }
    });

    if (result.error) {
      throw result.error;
    }
  } finally {
    // Restore original package.json regardless of pack success/failure
    restorePkg();
  }

  if (isYarn) {
    await bundleWithYarn(process.cwd(), packagejson, releaseDir, args, withFilename, isCI);
  } else {
    await bundleWithNpm(process.cwd(), packagejson, releaseDir, args, isCI);
  }
}

export { slugifyPkgName, resolveWorkspaceVersions, transformWorkspaceProtocols, resolveNewestTarball };

export default {
  bundleWithYarn,
  bundleWithNpm,
  getPackageHashes,
  slugifyPkgName,
  resolveWorkspaceVersions,
  transformWorkspaceProtocols,
  resolveNewestTarball
};
