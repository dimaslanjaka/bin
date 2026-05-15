const pkgJson = require("../../package.json");
const path = require("upath");
const fs = require("fs-extra");

/**
 * Locates binary scripts defined in package.json and verifies their existence on the filesystem.
 *
 * @param {boolean} [verbose=false] - If true, logs the search process and found paths to the console.
 * @returns {Array<{name: string, path: string, absolutePath: string}>}
 *   An array of objects containing:
 *   - `name`: The script name (key from `pkgJson.bin`).
 *   - `path`: The path relative to the current working directory.
 *   - `absolutePath`: The resolved absolute file system path.
 */
function listScript(verbose = false) {
  const keys = Object.keys(pkgJson.bin);
  const results = [];
  for (const scriptName of keys) {
    if (verbose) {
      console.log(`🔍 Finding script "${scriptName}" -> "${pkgJson.bin[scriptName]}"`);
    }
    const searchDirs = [
      path.join(__dirname, ".."),
      path.join(__dirname, "../.."),
      path.join(process.cwd(), "node_modules/binary-collections"),
      __dirname
    ];
    let scriptPath;
    for (const searchDir of searchDirs) {
      scriptPath = path.join(searchDir, pkgJson.bin[scriptName]);
      if (fs.existsSync(scriptPath)) {
        break;
      }
    }
    if (!fs.existsSync(scriptPath)) {
      console.warn(`⚠️  Script "${scriptName}" defined in package.json not found at ${scriptPath}`);
    } else {
      if (verbose) {
        console.log(`✅ Found script "${scriptName}" at ${scriptPath}`);
      }
      results.push({
        name: scriptName,
        path: path.relative(process.cwd(), scriptPath),
        absolutePath: path.resolve(scriptPath)
      });
    }
  }
  return results;
}

module.exports = listScript;
module.exports.default = listScript;
