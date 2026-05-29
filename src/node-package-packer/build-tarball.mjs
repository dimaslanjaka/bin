import fs from 'fs-extra';
import { file_to_hash } from 'sbg-utility';
import path from 'upath';
import buildReadme from './build-readme.mjs';
import { getArgs } from '../utils/index.cjs';
import * as crossSpawn from 'cross-spawn';

function slugifyPkgName(str) {
  return str.replace(/\//g, '-').replace(/@/g, '');
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

  let filename = 'package.tgz';
  let tgz = path.join(dirname, filename);
  const targetFname =
    argv['fn'] || argv['filename'] || slugifyPkgName(`${packagejson.name}-${packagejson.version}.tgz`);
  if (!fs.existsSync(tgz)) {
    filename = slugifyPkgName(`${packagejson.name}-v${packagejson.version}.tgz`);
    tgz = path.join(dirname, filename);
  }

  if (withFilename) {
    const tgzlatest = path.join(releaseDir, targetFname + '.tgz');
    if (fs.existsSync(tgz)) {
      fs.copySync(tgz, tgzlatest, { overwrite: true });
    }
  } else {
    const tgzlatest = path.join(releaseDir, slugifyPkgName(`${packagejson.name}.tgz`));
    const tgzversion = path.join(releaseDir, targetFname);

    if (fs.existsSync(tgz)) {
      fs.copySync(tgz, tgzlatest, { overwrite: true });
      fs.copySync(tgz, tgzversion, { overwrite: true });
    }
  }

  if (fs.existsSync(tgz)) {
    fs.rmSync(tgz, { recursive: true, force: true });
  }

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
export function bundle() {
  const args = getArgs();
  const withYarn = args._.includes('-yarn') || args._.includes('--yarn');
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

  const child = !withYarn
    ? crossSpawn.spawn('npm', ['pack'], {
        cwd: process.cwd(),
        shell: true,
        stdio: 'ignore',
        env: { PATH: process.env.PATH }
      })
    : crossSpawn.spawn('yarn', ['pack'], {
        cwd: process.cwd(),
        shell: true,
        stdio: 'ignore',
        env: { PATH: process.env.PATH }
      });

  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', async () => {
      try {
        if (isYarn) {
          await bundleWithYarn(process.cwd(), packagejson, releaseDir, args, withFilename, isCI);
        } else {
          await bundleWithNpm(process.cwd(), packagejson, releaseDir, args, isCI);
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

export default {
  bundleWithYarn,
  bundleWithNpm,
  getPackageHashes
};
