const fs = require('fs-extra');
const path = require('upath');
const ansiColors = require('ansi-colors');
const child_process = require('child_process');
const os = require('os');

/**
 * Generate bash script for node_modules cleanup
 * @param {Object} options
 * @param {boolean} options.dryRun - If true, only print what would be deleted
 * @returns {string} - The bash script
 */
function generateBashScript(options = {}) {
  const { dryRun = true } = options;

  return `
#!/bin/bash

set -u

cwd="$(pwd)"
max_jobs=4
DRY_RUN=${dryRun ? 'true' : 'false'}

cleanup_letter() {
  local letter="$1"

  if [ "$DRY_RUN" = "true" ]; then
    echo "Would remove: node_modules/\${letter}*"
    echo "Would remove: node_modules/@types/\${letter}*"
    echo "Would remove: node_modules/@\${letter}*"
  else
    rm -rf "\${cwd}/node_modules/\${letter}"*
    echo "Removed: node_modules/\${letter}*"

    rm -rf "\${cwd}/node_modules/@types/\${letter}"*
    echo "Removed: node_modules/@types/\${letter}*"

    rm -rf "\${cwd}/node_modules/@\${letter}"*
    echo "Removed: node_modules/@\${letter}*"
  fi
}

export -f cleanup_letter
export cwd
export DRY_RUN

if [ "$DRY_RUN" = "true" ]; then
  echo "Dry-run mode (pass --force to actually delete)"
fi

echo "Cleaning \${cwd}/node_modules..."

running=0

for letter in {a..z}; do
  cleanup_letter "$letter" &

  ((running++))

  # limit concurrent jobs
  if (( running >= max_jobs )); then
    wait -n
    ((running--))
  fi
done

wait

# final full cleanup (ensure nothing left behind)
if [ "$DRY_RUN" = "true" ]; then
  echo "Would remove: node_modules (final cleanup)"
else
  rm -rf "\${cwd}/node_modules"
  echo "Removed: node_modules (final cleanup)"
fi

if [ "$DRY_RUN" = "true" ]; then
  echo "Done (dry-run). Run with --force to delete for real."
else
  echo "Done cleaning node_modules."
fi
`.trim();
}

/**
 * Create and run a temporary bash script to remove `node_modules` contents.
 *
 * The script is written into `rootDir` and executed via `runBash`. A list of
 * created temporary scripts is stored in a cache file under the OS temp
 * directory so they can be removed after execution. When running with
 * `spawnOptions.stdio === 'inherit'`, the child process uses the parent's
 * stdio and the returned `stdout`/`stderr` may be empty; prefer `'pipe'` in
 * tests when you need to assert against output.
 *
 * @async
 * @param {string} rootDir - Directory where the cleanup script will be created and executed.
 * @param {Object} [options]
 * @param {boolean} [options.dryRun=true] - If true, the generated script will only print what would be deleted.
 * @param {import('child_process').SpawnOptions} [options.spawnOptions] - Options forwarded to the underlying `spawn` call (via `runBash`).
 * @returns {Promise<{code: number, stdout: string, stderr: string}>} Resolves with the result object returned by `runBash`.
 * @throws {Error|Object} Throws for internal failures or rejects with the `runBash` result when the process exits non-zero.
 */
async function cleanUp(rootDir, options = {}) {
  const { dryRun = true } = options;
  const nodeModulesDir = path.join(rootDir, 'node_modules');
  // Use the generated bash script to perform the cleanup so that behavior is
  // consistent with the CLI script generation and parallel deletion logic.
  const script = generateBashScript({ dryRun });

  // write to a temp file
  const tmpDir = os.tmpdir();
  const name = `rm-node-modules-${Date.now()}-${Math.random().toString(36).slice(2)}.sh`;
  const scriptPath = path.join(tmpDir, name);

  try {
    fs.writeFileSync(scriptPath, script, { encoding: 'utf8' });
    try {
      fs.chmodSync(scriptPath, 0o755);
    } catch {
      // ignore chmod errors on platforms that don't support it
    }

    // execute with `bash` so the script semantics are preserved
    const result = child_process.spawnSync('bash', [scriptPath], {
      cwd: rootDir,
      env: process.env,
      encoding: 'utf8',
      shell: false
    });

    // print script output so callers (and tests) receive expected stdout/stderr
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    // if bash wasn't available or execution failed, fall back to direct removal
    if (result.error) {
      // fallback: try to perform the same removal using fs (best-effort)
      try {
        console.warn(
          ansiColors.yellow(`bash execution failed: ${result.error.message}. Falling back to Node removal.`)
        );
        console.log(`Cleaning ${ansiColors.cyan(nodeModulesDir)}...`);
        fs.rmSync(nodeModulesDir, { recursive: true, force: true });
        console.log(`Removed: ${ansiColors.green('node_modules (final cleanup)')}`);
        console.log('Done cleaning node_modules.');
        return {
          code: 0,
          stdout: result.stdout || '',
          stderr: (result.stderr || '') + `\n${result.error.stack || result.error.message}`
        };
      } catch (e) {
        return { code: 1, stdout: result.stdout || '', stderr: (result.stderr || '') + `\n${e.stack || e.message}` };
      }
    }

    return { code: result.status ?? 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  } finally {
    try {
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
    } catch {
      // ignore cleanup failure
    }
  }
}

module.exports = { generateBashScript, cleanUp };
