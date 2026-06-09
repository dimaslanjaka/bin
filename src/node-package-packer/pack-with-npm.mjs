import fs from 'fs-extra';
import path from 'upath';
import buildReadme from './build-readme.mjs';
import { slugifyPkgName } from './utils.cjs';
import { getPackageHashes } from './build-tarball.mjs';

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
