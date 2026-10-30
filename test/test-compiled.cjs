const path = require('path');
const { execFileSync } = require('child_process');
const { globSync } = require('glob');
const fs = require('fs-extra');
/** @type {Record<string, string>} */
const binMapping = require('../tmp/bin-mapping.json');
const skippedBinaries = new Set(['9router', 'omniroute']);

// Get the current working directory as the project root.
const cwd = process.cwd();

// Define directories and file extensions that must be validated.
// Each directory can have its own set of expected compiled formats.
const dirs = [
  { name: 'lib/', rel: 'lib', exts: ['.cjs', '.mjs'] },
  { name: 'binaries/', rel: 'binaries', exts: ['.cjs'] }
];

// Track the number of successfully validated and failed files.
let failed = 0;
let passed = 0;

// Store directories where no compiled files were found.
// This helps detect missing build output instead of silently skipping it.
const emptyDirs = [];

/**
 * Validate compiled JavaScript files in a directory.
 *
 * @param {string} label - Display name of the directory.
 * @param {string} dirPath - Absolute path to the directory.
 * @param {string[]} exts - File extensions to validate.
 */
function checkDir(label, dirPath, exts) {
  // Process each expected file extension independently.
  for (const ext of exts) {
    // Recursively find matching files while excluding directories
    // and files containing "chunk" in their names.
    const files = globSync(`**/*${ext}`, {
      cwd: dirPath,
      nodir: true,
      ignore: ['*chunk*']
    }).sort();

    // Record missing compiled output so the validation can fail later.
    if (files.length === 0) {
      emptyDirs.push(`${label} (no ${ext} files)`);
      continue;
    }

    // Display the current validation group and the number of files found.
    console.log(`--- ${ext.slice(1).toUpperCase()} modules (${label}) ---`);
    console.log(`Found ${files.length} ${ext} files`);

    // Validate every discovered file individually.
    for (const f of files) {
      // Resolve the relative glob result into an absolute filesystem path.
      const absPath = path.resolve(dirPath, f);

      try {
        // Perform a syntax-only check without executing the module.
        // This prevents side effects from running compiled application code.
        execFileSync(process.execPath, ['-c', absPath], {
          timeout: 10000,
          stdio: 'pipe'
        });

        // Convert the absolute path into a project-relative path
        // and normalize separators for consistent output across platforms.
        const rel = path.relative(cwd, absPath).replace(/\\/g, '/');

        // Report successful syntax validation.
        console.log(`  ✅ ${rel}`);
        passed++;
      } catch (e) {
        // Extract the final stderr line to keep error output concise.
        const stderr = e.stderr ? e.stderr.toString().trim() : '';

        // Report the failed file and its most relevant error message.
        console.error(`  ❌ ${f}: ${stderr.split('\n').pop() || e.message}`);
        failed++;
      }
    }
  }
}

// Run compiled-output validation for every configured directory.
for (const d of dirs) {
  checkDir(d.name, path.resolve(cwd, d.rel), d.exts);
}

// Fail immediately if any expected directory contains no compiled files.
// Missing output indicates an incomplete or incorrectly configured build.
if (emptyDirs.length > 0) {
  throw new Error(`Missing compiled output in:\n  ${emptyDirs.join('\n  ')}`);
}

// Calculate the total number of files that were checked.
const total = passed + failed;

// Print a summary of the syntax validation results.
console.log(`\nPassed: ${passed}/${total}, Failed: ${failed}`);

// Return a non-zero exit code when at least one file fails validation.
// This allows CI pipelines to detect and report build failures.
if (failed > 0) process.exit(1);

// check that all binaries in binMapping exist in the binaries directory
for (const [binName, binPath] of Object.entries(binMapping)) {
  if (skippedBinaries.has(binName)) {
    console.log(`  ${binName} skipped`);
    continue;
  }

  const expectedPath = path.resolve(cwd, binPath);
  if (!fs.existsSync(expectedPath)) {
    console.error(`❌ Missing binary for ${binName}: expected at ${expectedPath}`);
    failed++;
  } else {
    // Invoke compiled JavaScript through Node for cross-platform validation.
    try {
      execFileSync(process.execPath, ['--check', expectedPath], {
        stdio: 'pipe',
        timeout: 10000
      });
      console.log(`  ✅ ${binName} is valid (${binPath})`);
    } catch (e) {
      console.error(`❌ ${binName} is not executable: ${e.message}`);
      failed++;
    }
  }
}

// Final check for missing binaries
if (failed > 0) {
  console.error(`\nMissing binaries detected: ${failed} missing.`);
  process.exit(1);
}

// Report successful completion when every compiled file passes.
console.log('✅ All compiled files pass syntax check');
