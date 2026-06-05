import fs from 'fs-extra';
import upath from 'upath';
import os from 'os';
import { spawn } from 'cross-spawn';

/**
 * Get npm cache directory using `npm config get cache`
 */
function getNpmCacheDir(): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['config', 'get', 'cache'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.stderr?.on('data', (data) => {
      error += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Failed to get npm cache directory (code ${code}): ${error}`));
      }
    });
  });
}

/**
 * Remove directory safely
 */
async function removeDir(target: string): Promise<void> {
  try {
    const exists = await fs.pathExists(target);

    if (exists) {
      console.log(`Removing: ${target}`);
      await fs.remove(target);
    } else {
      console.log(`Not found: ${target}`);
    }
  } catch (err) {
    console.error(`Failed to remove ${target}:`, err);
  }
}

/**
 * Main cleaner
 */
export async function cleanNpxCache(): Promise<void> {
  const cacheDir = await getNpmCacheDir();

  console.log('Detected npm cache:', cacheDir);
  console.log('\nCleaning npm/npx cache...\n');

  const npxCache = upath.join(cacheDir, '_npx');
  const npmCache = upath.join(cacheDir, '_cacache');
  const altNpxLinux = upath.join(os.homedir(), '.cache', 'npx');

  await Promise.all([removeDir(npxCache), removeDir(npmCache), removeDir(altNpxLinux)]);

  console.log('\nDone ✔️');
}
