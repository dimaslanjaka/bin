import fs from 'fs-extra';
import { file_to_hash } from 'sbg-utility';
import path from 'upath';
import { getArgs } from '../utils/index.cjs';
import * as crossSpawn from 'cross-spawn';
import { globSync } from 'glob';
import { bundleWithYarn } from './pack-with-yarn.mjs';
import { bundleWithNpm } from './pack-with-npm.mjs';
import { bundleWithBun } from './pack-with-bun.mjs';
import { transformWorkspaceProtocols, resolveWorkspaceVersions } from './transform-workspace-protocols.mjs';

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
    const sizeKB = parseFloat(stat.size / Math.pow(1024, 1)).toFixed(2);
    console.log(`[tarball] ${path.basename(file)}: ${sizeKB} KB`);
    const size = `${sizeKB} KB`;
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
 * Collect large artifact files from workspace packages that bloat the pack tarball.
 * These are artifacts from submodule builds (release tarballs, yarn releases) that
 * are not needed in the root package's pack output.
 *
 * @param {string} cwd - Repository root directory.
 * @returns {Array<{path: string, sizeMB: number}>} List of large artifact files.
 */
function collectWorkspaceArtifacts(cwd) {
  const patterns = ['packages/*/release/*.tgz', 'packages/*/releases/*.tgz', 'packages/*/.yarn/releases/*.cjs'];
  const files = [];
  for (const pattern of patterns) {
    const matches = globSync(pattern, { cwd: cwd });
    for (const match of matches) {
      const absPath = path.resolve(cwd, match);
      try {
        const stat = fs.statSync(absPath);
        const sizeMB = stat.size / (1024 * 1024);
        files.push({ path: absPath, sizeMB });
      } catch {
        // file may have been removed by a concurrent process
      }
    }
  }
  return files;
}

/**
 * Pack the current project into a tarball and prepare release metadata.
 *
 * Determines which package manager to use (bun → yarn → npm) based on
 * lockfile presence and CLI flags (`--yarn`, `--bun`). Before packing,
 * transforms `workspace:*` / `workspace:^` / `workspace:~` protocol
 * references in `package.json` to resolved version ranges, then restores
 * the original after packing completes (even on failure).
 *
 * Tarballs are emitted into `releases/` (or `release/` as fallback).
 * After packing, delegates to the tool-specific bundler
 * (`bundleWithBun`, `bundleWithYarn`, or `bundleWithNpm`) for post-processing.
 *
 * @param {import("minimist").ParsedArgs} [customArgs={}] - Override CLI argument parsing.
 *   Properties are merged with parsed `process.argv` via `getArgs()`.
 *   Supported keys include `yarn` (boolean), `bun` (boolean),
 *   `fn`/`filename` (boolean) to force a named tarball, and any other
 *   args consumed by downstream bundlers.
 * @param {string} [cwd] - Working directory for packing. Defaults to
 *   `customArgs.cwd` if set, otherwise `process.cwd()`.
 * @returns {Promise<void>}
 */
export async function bundle(customArgs = {}, cwd) {
  const args = Object.assign(customArgs, getArgs());
  cwd = cwd || args.cwd || process.cwd();
  const withYarn = args.yarn || args._.includes('-yarn') || args._.includes('--yarn');
  const withBun = args.bun || args._.includes('-bun') || args._.includes('--bun');
  const releaseDir1 = path.join(cwd, 'release');
  const releaseDir2 = path.join(cwd, 'releases');
  const releaseDir = !fs.existsSync(releaseDir2) ? releaseDir1 : releaseDir2;
  const isBun = fs.existsSync(path.join(cwd, 'bun.lockb')) || fs.existsSync(path.join(cwd, 'bun.lock')) || withBun;
  const isYarn = !isBun && (fs.existsSync(path.join(cwd, 'yarn.lock')) || withYarn);
  const packagejson = fs.readJSONSync(path.join(cwd, 'package.json'));
  /**
   * is current device is Github Actions
   */
  const isCI = process.env.GITHUB_ACTION && process.env.GITHUB_ACTIONS;

  console.log(`[bundle] cwd=${cwd}\n releaseDir=${releaseDir}\n isYarn=${isYarn}\n isBun=${isBun}`);
  console.log(`[bundle] packCmd=${isBun ? 'bun pm pack' : isYarn ? 'yarn pack' : 'npm pack'}`);

  // create released directory when not exist
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirpSync(releaseDir, { recursive: true });
    console.log(`[bundle] created release dir ${releaseDir}`);
  }

  // Transform workspace protocol references (workspace:^, workspace:*, workspace:~)
  // to real version ranges before packing, then restore after.
  console.log('[bundle] transforming workspace protocols...');
  const restorePkg = await transformWorkspaceProtocols(cwd);
  console.log('[bundle] workspace protocols done');

  // Remove large workspace artifacts before packing to avoid tarball bloat.
  // Yarn Berry includes workspace packages in `yarn pack` output by default,
  // and submodule build artifacts (release tarballs, yarn releases) can exceed
  // release size limits (e.g., GitHub's 30 MB). These are git-tracked files in
  // submodules, so they're always recoverable via `git checkout`.
  const workspaceArtifacts = collectWorkspaceArtifacts(cwd);
  for (const { path: filePath, sizeMB } of workspaceArtifacts) {
    fs.removeSync(filePath);
    console.log(`[bundle] removed workspace artifact ${path.relative(cwd, filePath)} (${sizeMB.toFixed(1)} MB)`);
  }

  try {
    console.log('[bundle] spawning pack command...');
    const result = crossSpawn.sync(
      isBun ? 'bun' : isYarn ? 'yarn' : 'npm',
      isBun ? ['pm', 'pack', '--ignore-scripts', '--destination', releaseDir] : ['pack'],
      {
        cwd: cwd,
        stdio: 'inherit',
        env: { ...process.env }
      }
    );
    console.log('[bundle] pack command exited with status=' + result.status);

    if (result.error) {
      throw result.error;
    }
  } finally {
    // Restore original package.json regardless of pack success/failure
    console.log('[bundle] restoring package.json...');
    restorePkg();
    console.log('[bundle] restore done');
  }

  console.log('[bundle] running post-pack bundler...');
  if (isBun) {
    await bundleWithBun(cwd, packagejson, releaseDir, args, isCI);
  } else if (isYarn) {
    await bundleWithYarn(cwd, packagejson, releaseDir, args, isCI);
  } else {
    await bundleWithNpm(cwd, packagejson, releaseDir, args, isCI);
  }
  console.log('[bundle] done');
}

export { resolveWorkspaceVersions, transformWorkspaceProtocols, resolveNewestTarball };

export default {
  bundleWithYarn,
  bundleWithNpm,
  bundleWithBun,
  getPackageHashes,
  resolveWorkspaceVersions,
  transformWorkspaceProtocols,
  resolveNewestTarball
};
