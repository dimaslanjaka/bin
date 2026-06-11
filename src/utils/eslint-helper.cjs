const crossSpawn = require('cross-spawn');
const path = require('path');

/**
 * Run ESLint --fix on a file with the project's flat config.
 * @param {string} file - absolute path to the file to fix
 * @param {string} [cwd] - project root directory for relative path display (defaults to process.cwd())
 */
function eslintFix(file, cwd) {
  const root = cwd || process.cwd();
  try {
    const result = crossSpawn.sync('npx', ['eslint', '--fix', '--no-ignore', file], {
      stdio: 'pipe',
      env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'true' }
    });
    if (result.status !== 0) {
      const stderr = result.stderr?.toString().trim();
      if (stderr) console.warn(`   ⚠ eslint stderr: ${stderr}`);
    }
    console.log(`   ✅ ESLint --fix applied to ${path.relative(root, file)}`);
  } catch (err) {
    console.warn(`   ⚠ ESLint --fix failed: ${err.message}`);
  }
}

module.exports = { eslintFix };
