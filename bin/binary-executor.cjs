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
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

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
const candidates = process.platform === "win32" ? [".cmd", ".bat", ".ps1", ".vbs"] : [".sh", ""];

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

  if (fs.existsSync(script)) {
    found = script;
    break;
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
const isPs1 = found.endsWith(".ps1");
const isCmd = found.endsWith(".cmd");

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
  cmd = "powershell.exe";

  args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", found, ...process.argv.slice(2)];

  /**
   * CMD batch files:
   *
   * Run through cmd.exe using:
   *   /c
   * which means:
   *   "execute command and terminate"
   */
} else if (isCmd) {
  cmd = "cmd.exe";

  args = ["/c", found, ...process.argv.slice(2)];

  /**
   * Other scripts:
   *
   * Usually:
   *   - shell scripts (.sh)
   *   - executable binaries
   *
   * These can be executed directly.
   */
} else {
  cmd = found;
  args = process.argv.slice(2);
}

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
  stdio: "inherit"
});

/**
 * Exit using the same exit code
 * returned by the child process.
 *
 * If result.status is null/undefined,
 * default to exit code 1.
 */
process.exit(result.status ?? 1);
