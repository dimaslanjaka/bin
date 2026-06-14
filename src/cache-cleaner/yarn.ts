import { spawn } from 'cross-spawn';
import * as glob from 'glob';
import { rimraf } from 'rimraf';
import * as path from 'path';

export function yarnVersion() {
  return new Promise<string>((resolve, reject) => {
    const process = spawn('yarn', ['--version'], {
      stdio: 'pipe'
    });

    let version = '';
    process.stdout.on('data', (data) => {
      version += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(version.trim());
      } else {
        reject(new Error(`Yarn version check failed with exit code ${code}`));
      }
    });
  });
}

export async function cleanYarnCache() {
  let version = '';
  try {
    version = await yarnVersion();
  } catch {
    // if version check fails, just try the generic command
  }

  const major = parseInt(version.split('.')[0], 10);
  const isClassic = major === 1 || version === '';
  const args = isClassic ? ['cache', 'clean'] : ['cache', 'clean', '--all'];

  return new Promise((resolve, reject) => {
    const process = spawn('yarn', args, {
      stdio: 'inherit'
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Yarn cache clean failed with exit code ${code}`));
      }
    });
  });
}

export interface FindProjectYarnCachesOptions {
  /** Working directory to search from (default: process.cwd()) */
  cwd?: string;
  /** Glob patterns to ignore (default: ['**\u002f.git*', '**\u002fvendor\u002f**']) */
  ignore?: string[];
}

/**
 * Find project-level Yarn cache files/directories.
 * Searches for `.yarn/cache*` directories and `.yarn/*.gz` files
 * (Yarn Berry / Yarn 2+ offline mirror cache).
 */
export async function findProjectYarnCaches(options?: FindProjectYarnCachesOptions): Promise<string[]> {
  const { cwd = process.cwd(), ignore = ['**/.git*', '**/vendor/**'] } = options || {};
  const results = await glob.glob(['**/.yarn/cache*', '**/.yarn/*.gz'], {
    cwd,
    ignore,
    dot: true,
    nodir: false
  });
  return results;
}

/**
 * Delete project-level Yarn cache files/directories.
 * Finds `.yarn/cache*` and `.yarn/*.gz` files, then removes them.
 * @returns The list of deleted paths.
 */
export async function cleanProjectYarnCaches(options?: FindProjectYarnCachesOptions): Promise<string[]> {
  const paths = await findProjectYarnCaches(options);
  const cwd = options?.cwd || process.cwd();
  for (const p of paths) {
    await rimraf(path.resolve(cwd, p));
  }
  return paths;
}
