import fs from 'fs-extra';
import path from 'upath';
import buildReadme from './build-readme.mjs';
import { slugifyPkgName } from './utils.cjs';
import { resolveNewestTarball, getPackageHashes } from './build-tarball.mjs';

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

  const rawFname = argv['fn'] || argv['filename'] || slugifyPkgName(`${packagejson.name}-${packagejson.version}.tgz`);
  const targetFname = rawFname.endsWith('.tgz') ? rawFname : rawFname + '.tgz';
  const tgz = resolveNewestTarball(dirname, [
    'package.tgz',
    slugifyPkgName(`${packagejson.name}-v${packagejson.version}.tgz`)
  ]);

  if (!tgz) {
    throw new Error(`No Yarn pack tarball found in ${dirname}`);
  }

  if (withFilename) {
    const tgzlatest = path.join(releaseDir, targetFname);
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
