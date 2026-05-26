import { getAllFiles, buildChecksum } from './hash.js';
import { loadCache, saveCache, getCacheFile } from './cache.js';
import { spawn } from 'child_process';

/**
 * @param {{
 *   patterns: string[],
 *   ignore?: string[],
 *   exec: string,
 *   cwd?: string,
 *   dryRun?: boolean
 * }} options
 * @returns {Promise<{ changed: boolean, cacheFile: string, files: string[], skipped?: boolean }>}
 */
export async function runChecksum({
  patterns = [],
  ignore = [],
  exec,
  cwd = process.env.INIT_CWD || process.cwd(),
  dryRun = false
}) {
  if (!patterns.length && !exec) {
    console.log('No patterns or command provided, skipping checksum runner.');
    process.exit(1);
  }
  if (!exec) {
    console.log('No command provided, skipping checksum runner.');
    process.exit(1);
  }
  if (!patterns.length) {
    console.log('No patterns provided, skipping checksum runner.');
    process.exit(1);
  }

  const files = getAllFiles({ patterns, ignore, cwd });
  const checksum = buildChecksum(files);

  const cacheFile = getCacheFile({ patterns, ignore, cwd });
  const cache = loadCache(cacheFile);

  if (cache?.checksum === checksum) {
    return {
      changed: false,
      cacheFile,
      files
    };
  }

  saveCache(cacheFile, {
    checksum,
    files,
    patterns,
    ignore,
    updatedAt: new Date().toISOString()
  });

  if (dryRun) {
    return {
      changed: true,
      cacheFile,
      files,
      skipped: true
    };
  }

  await runCommand(exec, cwd);

  return {
    changed: true,
    cacheFile,
    files
  };
}

/**
 * @param {string} command
 * @param {string} [cwd]
 * @returns {Promise<void>}
 */
function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: 'inherit',
      cwd
    });

    child.on('exit', (code) => {
      if (code === 0 || code === null) resolve();
      else reject(new Error(`Command failed: ${code}`));
    });
  });
}
