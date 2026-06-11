const { exec } = require('child_process');
const { spawn, spawnSync } = require('cross-spawn');
const util = require('util');
const fs = require('fs');
const path = require('upath');
const execP = util.promisify(exec);

function log(...args) {
  console.log('[php-cs-fixer-staged]', ...args);
}

function isPathLike(p) {
  return p.includes('/') || p.includes('\\\\') || p.includes(path.sep);
}

async function findPhpCsFixer() {
  const candidates = ['php-cs-fixer', 'vendor/bin/php-cs-fixer', 'bin/php-cs-fixer', 'tools/php-cs-fixer'];

  for (const c of candidates) {
    try {
      let cmd;
      let args;

      if (isPathLike(c)) {
        const resolved = path.resolve(process.cwd(), c);
        if (!fs.existsSync(resolved)) continue;
        if (process.platform === 'win32') {
          cmd = 'php';
          args = [resolved, '--version'];
        } else {
          cmd = resolved;
          args = ['--version'];
        }
      } else {
        cmd = c;
        args = ['--version'];
      }

      const res = spawnSync(cmd, args, { encoding: 'utf8' });
      if (res && res.status === 0) return c;
    } catch (_e) {
      // try next
    }
  }

  // Last attempt: maybe php-cs-fixer.phar in repo root
  try {
    const phar = path.resolve(process.cwd(), 'php-cs-fixer.phar');
    if (fs.existsSync(phar)) return phar;
  } catch (_e) {
    // ignore
  }

  return null;
}

async function getStagedPhpFiles() {
  try {
    const { stdout } = await execP('git diff --name-only --cached --diff-filter=ACM');
    return stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((f) => f.toLowerCase().endsWith('.php'));
  } catch (err) {
    throw new Error('Failed to get staged files: ' + err.message);
  }
}

async function run() {
  const files = await getStagedPhpFiles();
  if (!files.length) {
    log('No staged PHP files found. Nothing to do.');
    return 0;
  }

  const bin = await findPhpCsFixer();
  if (!bin) {
    console.error('php-cs-fixer binary not found in PATH or common locations.');
    console.error('Install php-cs-fixer or add it to PATH, or place it in vendor/bin/.');
    return 2;
  }

  log('Running', bin, 'on', files.length, 'file(s)');

  return new Promise((resolve) => {
    // If bin is a path-like candidate and we're on Windows, invoke via `php <script>`
    let cmd;
    let args;
    if (isPathLike(bin)) {
      const resolved = path.resolve(process.cwd(), bin);
      if (process.platform === 'win32') {
        cmd = 'php';
        args = [resolved, 'fix', ...files];
      } else {
        cmd = resolved;
        args = ['fix', ...files];
      }
    } else {
      cmd = bin;
      args = ['fix', ...files];
    }

    const child = spawn(cmd, args, { stdio: 'inherit', shell: false });
    child.on('close', (code) => {
      if (code === 0) {
        log('php-cs-fixer completed successfully.');
      } else {
        console.error('php-cs-fixer exited with code', code);
      }
      resolve(code);
    });
    child.on('error', (err) => {
      console.error('Failed to run php-cs-fixer:', err.message);
      resolve(3);
    });
  });
}

if (require.main === module) {
  run()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(4);
    });
}

module.exports = { run, getStagedPhpFiles };

// Provide a "default" alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
