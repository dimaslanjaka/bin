import { spawn } from 'cross-spawn';

export function npmVersion() {
  return new Promise<string>((resolve, reject) => {
    const process = spawn('npm', ['--version'], {
      stdio: 'pipe',
      shell: true
    });

    let version = '';
    process.stdout.on('data', (data) => {
      version += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(version.trim());
      } else {
        reject(new Error(`NPM version check failed with exit code ${code}`));
      }
    });
  });
}

export function cleanNpmCache() {
  return new Promise((resolve, reject) => {
    const process = spawn('npm', ['cache', 'clean', '--force'], {
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`NPM cache clean failed with exit code ${code}`));
      }
    });
  });
}
