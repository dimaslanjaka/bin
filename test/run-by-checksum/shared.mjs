import path from 'upath';
import fs from 'fs-extra';
import { spawnSync } from 'child_process';

/** Shared test root directory for run-by-checksum tests */
export const TEST_ROOT = path.join(process.cwd(), 'tmp', 'test-repo-runChecksum');
if (!fs.existsSync(TEST_ROOT)) {
  fs.mkdirpSync(TEST_ROOT);
  if (!fs.existsSync(path.join(TEST_ROOT, 'package.json'))) {
    spawnSync('npm', ['init', '-y'], { cwd: TEST_ROOT, stdio: 'inherit' });
  }
  if (!fs.existsSync(path.join(TEST_ROOT, 'yarn.lock'))) {
    fs.writeFileSync(path.join(TEST_ROOT, 'yarn.lock'), '');
  }
  spawnSync('yarn', ['add', 'jquery'], { cwd: TEST_ROOT, stdio: 'inherit' });
}

/**
 * Ensure a directory exists (creates intermediate dirs if needed).
 * @param {string} dirPath - Absolute or relative directory path
 * @returns {string} The same path
 */
export function ensureTestDir(dirPath) {
  fs.mkdirpSync(dirPath);
  return dirPath;
}

/**
 * Create a test file with the given content.
 * @param {string} baseDir - Base directory (e.g. TEST_ROOT or a sandbox subdir)
 * @param {string} relPath - Relative file path from baseDir
 * @param {string} content - File content
 * @returns {string} Absolute path to the created file
 */
export function createTestFile(baseDir, relPath, content) {
  const fullPath = path.join(baseDir, relPath);
  fs.mkdirpSync(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content);
  return fullPath;
}

/**
 * Read a test file's content.
 * @param {string} baseDir - Base directory
 * @param {string} relPath - Relative file path from baseDir
 * @returns {string} File content as UTF-8 string
 */
export function readTestFile(baseDir, relPath) {
  return fs.readFileSync(path.join(baseDir, relPath), 'utf-8');
}

/**
 * Delete a file or directory.
 * @param {string} targetPath - Absolute path to the file/dir to remove
 */
export function deleteTestFile(targetPath) {
  fs.removeSync(targetPath);
}

/**
 * Update (overwrite) a test file's content. Same as createTestFile
 * but kept as a separate semantic alias for CRUD completeness.
 * @param {string} baseDir - Base directory
 * @param {string} relPath - Relative file path from baseDir
 * @param {string} content - New file content
 * @returns {string} Absolute path to the updated file
 */
export function updateTestFile(baseDir, relPath, content) {
  return createTestFile(baseDir, relPath, content);
}

/** Helper to clean up the test root directory */
export function cleanTestRoot() {
  fs.emptyDirSync(TEST_ROOT);
}
