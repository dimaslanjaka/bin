import fs from 'fs-extra';
import path from 'upath';
import buildReadme from './build-readme.mjs';
import { slugifyPkgName } from './utils.cjs';
import { resolveNewestTarball, getPackageHashes } from './build-tarball.mjs';

/**
 * Build release tarballs using the bun pm pack output.
 *
 * Bun's `bun pm pack` supports `--destination <dir>` to write the tarball
 * directly to the release directory, and `--quiet` for automation-friendly
 * output. The resulting `.tgz` uses the same `<name>-<version>.tgz` naming
 * as npm's `npm pack`.
 *
 * @param {string} dirname Repository root directory.
 * @param {object} packagejson Parsed package.json content.
 * @param {string} releaseDir Release output directory.
 * @param {object} argv Parsed CLI arguments.
 * @param {boolean} isCI Whether the process is running in CI.
 * @returns {Promise<void>}
 */
export async function bundleWithBun(dirname, packagejson, releaseDir, argv, isCI) {
  await buildReadme(dirname, packagejson, releaseDir, argv, isCI);

  const rawFname = argv['fn'] || argv['filename'] || slugifyPkgName(`${packagejson.name}-${packagejson.version}.tgz`);
  const targetFname = rawFname.endsWith('.tgz') ? rawFname : rawFname + '.tgz';

  // Bun outputs directly to releaseDir via --destination, so scan there
  const tgz = resolveNewestTarball(releaseDir, [
    slugifyPkgName(`${packagejson.name}-${packagejson.version}.tgz`),
    'package.tgz'
  ]);

  if (!tgz) {
    throw new Error(`No Bun pack tarball found in ${releaseDir}`);
  }

  const tgzLatest = path.join(releaseDir, slugifyPkgName(`${packagejson.name}.tgz`));
  const tgzVersion = path.join(releaseDir, targetFname);

  fs.copySync(tgz, tgzLatest, { overwrite: true });
  fs.copySync(tgz, tgzVersion, { overwrite: true });
  fs.rmSync(tgz, { recursive: true, force: true });

  await getPackageHashes(dirname, releaseDir);
}
