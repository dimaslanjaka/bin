import fs from 'fs-extra';
import { file_to_hash } from 'sbg-utility';
import path from 'upath';
import * as crossSpawn from 'cross-spawn';
import * as tar from 'tar';
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
 * Patterns for workspace artifact entries inside the pack tarball that are not
 * needed in the published package (submodule release tarballs, yarn releases).
 */
const workspaceArtifactPatterns = [
  /^package\/packages\/[^/]+\/release\/.+\.tgz$/,
  /^package\/packages\/[^/]+\/releases\/.+\.tgz$/,
  /^package\/packages\/[^/]+\/\.yarn\/releases\/.+\.cjs$/
];

/**
 * Check if a tarball entry path matches a workspace artifact pattern.
 * @param {string} entryPath - Path inside the tarball.
 * @returns {boolean}
 */
function isWorkspaceArtifact(entryPath) {
  return workspaceArtifactPatterns.some((re) => re.test(entryPath));
}

/**
 * Post-process a pack tarball: remove workspace artifact entries (submodule
 * release tarballs, yarn releases) that bloat the output. Works by extracting
 * to a temp directory with a filter, then repacking.
 *
 * @param {string} tarballPath - Path to the .tgz file to clean.
 * @returns {Promise<void>}
 */
async function cleanTarball(tarballPath) {
  if (!fs.existsSync(tarballPath)) return;

  const dir = path.dirname(tarballPath);
  const tmpDir = path.join(dir, '.tmp-tarball-clean');
  const basename = path.basename(tarballPath);

  // Track removed entries for logging
  const removed = [];

  try {
    // Ensure temp directory exists before extracting into it
    fs.mkdirpSync(tmpDir);

    // Extract everything to tmp, filtering out artifacts
    await tar.extract({
      file: tarballPath,
      cwd: tmpDir,
      filter: (entryPath) => {
        if (isWorkspaceArtifact(entryPath)) {
          removed.push(entryPath);
          return false;
        }
        return true;
      }
    });

    if (removed.length > 0) {
      // Remove original tarball
      fs.removeSync(tarballPath);
      // Repack from temp dir
      await tar.create(
        {
          file: tarballPath,
          gzip: true,
          cwd: tmpDir,
          portable: true
        },
        ['.']
      );

      for (const entry of removed) {
        console.log(`[bundle] stripped from tarball: ${entry}`);
      }
      console.log(`[bundle] cleaned ${basename}: removed ${removed.length} workspace artifact entries`);
    }
  } finally {
    // Always clean up temp dir
    if (fs.existsSync(tmpDir)) {
      fs.removeSync(tmpDir);
    }
  }
}

/**
 * Pack the current project into a tarball and prepare release metadata.
 *
 * Before packing, transforms `workspace:*` / `workspace:^` / `workspace:~`
 * protocol references in `package.json` to resolved version ranges, then
 * restores the original after packing completes (even on failure).
 *
 * Tarballs are emitted into `releases/` (or `release/` as fallback).
 * After packing, delegates to the tool-specific bundler
 * (`bundleWithBun`, `bundleWithYarn`, or `bundleWithNpm`) for post-processing.
 *
 * @param {object} [options] - Bundle options.
 * @param {string} [options.cwd] - Working directory for packing (default: process.cwd()).
 * @param {'yarn'|'bun'|'npm'} [options.pm] - Package manager to use (default: 'npm').
 * @param {string} [options.filename] - Custom output filename (without .tgz extension).
 * @param {boolean} [options.commit] - Auto-commit tarballs via git (default: false).
 * @returns {Promise<void>}
 */
export async function bundle(options = {}) {
  const { cwd: cwdOption = process.cwd(), pm = 'npm', filename, commit = false } = options;
  const cwd = cwdOption;
  const releaseDir1 = path.join(cwd, 'release');
  const releaseDir2 = path.join(cwd, 'releases');
  const releaseDir = !fs.existsSync(releaseDir2) ? releaseDir1 : releaseDir2;
  const isBun = pm === 'bun';
  const isYarn = pm === 'yarn';
  const packagejson = fs.readJSONSync(path.join(cwd, 'package.json'));
  /**
   * is current device is Github Actions
   */
  const isCI = process.env.GITHUB_ACTION && process.env.GITHUB_ACTIONS;

  // Build args object for downstream bundlers (bundleWithYarn/Npm/Bun, buildReadme)
  const args = {};
  if (filename) args.fn = filename;
  if (commit) args.commit = true;

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

  // Post-process: strip workspace artifact files from the generated tarballs.
  // Yarn/Npm pack includes workspace packages and their build artifacts
  // (submodule release tarballs, yarn releases), which can bloat the output
  // past GitHub's 30 MB limit. We extract, filter, and repack — never touching
  // source files on disk.
  const tarballs = fs.readdirSync(releaseDir).filter((f) => f.endsWith('.tgz'));
  for (const tarball of tarballs) {
    await cleanTarball(path.join(releaseDir, tarball));
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
