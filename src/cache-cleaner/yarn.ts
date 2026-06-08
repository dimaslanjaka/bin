import { spawn } from 'cross-spawn';

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
