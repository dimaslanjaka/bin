const { spawn } = require('cross-spawn');
const fs = require('fs');
const path = require('upath');

/**
 * Run a bash script using spawn
 * @param {string} file - path to bash file
 * @param {import("child_process").SpawnOptions} options
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
function runBash(file, options = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, ...(options.env || {}) };
    // Remove env from options to avoid conflicts
    if (options.env) delete options.env;
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      // Add some UNIX port of bash for Windows, like Git Bash or WSL, to PATH and use it to run the script
      const candidates = [
        'C:\\Program Files\\Git\\bin',
        'C:\\Program Files\\Git\\usr\\bin',
        'C:\\laragon\\bin\\git\\bin',
        path.join(process.cwd(), 'node_modules', '.bin'),
        path.join(process.cwd(), 'vendor', 'bin'),
        path.join(process.cwd(), 'bin'),
        path.join(process.cwd(), 'venv', 'Scripts'),
        path.join(process.cwd(), '.venv', 'Scripts')
      ].filter((dir) => fs.existsSync(dir));
      // If we found a candidate, add it to PATH
      if (candidates.length > 0) {
        env.PATH = `${candidates.join(';')};${env.PATH}`;
      } else {
        return reject(
          new Error("No suitable bash found on Windows. Please install Git Bash or WSL and ensure it's in your PATH.")
        );
      }
    }
    const proc = spawn('bash "' + file.replace(/"/g, '\\"') + '"', {
      shell: true,
      env,
      ...options
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('close', (code) => {
      const result = { code, stdout, stderr };

      if (code === 0) return resolve(result);
      return reject(result);
    });
  });
}

module.exports = { runBash };
module.exports.default = runBash; // For ESM compatibility
