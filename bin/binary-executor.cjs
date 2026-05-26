#!/usr/bin/env node

/**
 * Built-in Node.js modules:
 *
 * - child_process:
 *   Used to launch external scripts/programs.
 *
 * - path:
 *   Safely handles file paths across operating systems.
 *
 * - fs:
 *   Used to check whether files exist.
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const which = require('which');

/**
 * __dirname
 *   Absolute directory path of this launcher script.
 *
 * __filename
 *   Absolute path of this launcher file itself.
 *
 * base
 *   Filename without extension.
 *
 * Example:
 *   File = "/tools/mytool.js"
 *
 *   binDir = "/tools"
 *   base   = "mytool"
 */
const binDir = __dirname;
const base = path.basename(__filename, path.extname(__filename));

/**
 * Determine which script extensions to search for
 * based on the current operating system.
 *
 * Windows:
 *   .cmd
 *   .bat
 *   .ps1
 *   .vbs
 *
 * Linux/macOS:
 *   .sh
 *   executable file without extension
 */
const candidates = process.platform === 'win32' ? ['.cmd', '.bat', '.ps1', '.vbs'] : ['.sh', ''];

/**
 * Search for the first matching script
 * in the same directory as this launcher.
 *
 * Example:
 *   If base = "mytool"
 *
 *   Windows checks:
 *     mytool.cmd
 *     mytool.bat
 *     mytool.ps1
 *     mytool.vbs
 *
 *   Linux/macOS checks:
 *     mytool.sh
 *     mytool
 */
let found = null;

for (const ext of candidates) {
  const script = path.join(binDir, base + ext);
  const exists = fs.existsSync(script);
  // console.log(`Checking for ${script}: ${exists ? 'found' : 'not found'}`);
  if (exists) {
    found = script;
    break;
  }
}

/**
 * If no matching script was found,
 * try check if `bash` is available and if so, check for a .sh script.
 */
if (!found) {
  try {
    spawnSync('bash', ['--version'], { stdio: 'ignore' });
    const bashScript = [path.join(binDir, base), path.join(binDir, base + '.sh')].find((script) =>
      fs.existsSync(script)
    );
    if (bashScript) {
      found = bashScript;
    }
  } catch {
    // bash is not available, do nothing
  }
}

/**
 * If no matching script was found,
 * print an error and exit with failure code 1.
 */
if (!found) {
  console.error(`No script found for ${base} in ${binDir}`);
  process.exit(1);
}

/**
 * Detect special script types
 * that require a shell/interpreter.
 */
const isPs1 = found.endsWith('.ps1');
const isCmd = found.endsWith('.cmd');
const isUnixShell = found.endsWith('.sh') || path.extname(found) === '';

/**
 * cmd
 *   The executable program to launch.
 *
 * args
 *   Arguments passed to the executable.
 */
let cmd, args;

/**
 * PowerShell scripts:
 *
 * Run through powershell.exe because .ps1 files
 * are not directly executable like binaries.
 *
 * Flags:
 *   -NoProfile
 *     Prevent loading user profile scripts.
 *
 *   -ExecutionPolicy Bypass
 *     Allow script execution even if policy blocks it.
 *
 *   -File
 *     Specifies the script to execute.
 *
 * process.argv.slice(2)
 *   Forward all user-provided command-line arguments.
 */
if (isPs1) {
  cmd = 'powershell.exe';

  args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', found, ...process.argv.slice(2)];

  /**
   * CMD batch files:
   *
   * Run through cmd.exe using:
   *   /c
   * which means:
   *   "execute command and terminate"
   */
} else if (isCmd) {
  cmd = 'cmd.exe';

  args = ['/c', found, ...process.argv.slice(2)];

  /**
   * Other scripts:
   *
   * Usually:
   *   - shell scripts (.sh)
   *   - executable binaries
   *
   * These can be executed directly.
   */
} else if (isUnixShell) {
  // Capture shebang scripts (no extension) and .sh scripts
  const shebang = fs.readFileSync(found, 'utf8').split('\n')[0].trim();
  const interpreter = shebang.startsWith('#!')
    ? shebang
        .slice(2)
        .trim()
        .replace(/^\/usr\/bin\/env\s+/, '')
        .replace(/^\/bin\/env\s+/, '')
        .replace(/^\/usr\/bin\//, '')
        .replace(/^\/bin\//, '')
    : null;

  if (interpreter) {
    const resolvedOrNull = which.sync(interpreter, { nothrow: true });
    cmd = resolvedOrNull || interpreter;
    args = [found, ...process.argv.slice(2)];
  } else {
    cmd = found;
    args = process.argv.slice(2);
  }
} else {
  cmd = found;
  args = process.argv.slice(2);
}

console.log(
  `Executing: ${path.isAbsolute(cmd) ? path.relative(process.cwd(), cmd) : cmd} ${args
    .map((f) => {
      if (path.isAbsolute(f)) return path.relative(process.cwd(), f);
      return f;
    })
    .join(' ')}`
);

/**
 * Execute the selected script synchronously.
 *
 * stdio: "inherit"
 *   Shares the current terminal with the child process,
 *   so stdout/stderr/input behave normally.
 *
 * spawnSync waits until the child process exits.
 */
const result = spawnSync(cmd, args, {
  stdio: 'inherit'
});

/**
 * Exit using the same exit code
 * returned by the child process.
 *
 * If result.status is null/undefined,
 * default to exit code 1.
 */
process.exit(result.status ?? 1);
