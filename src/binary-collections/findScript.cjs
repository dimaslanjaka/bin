const { glob } = require("glob");
const path = require("upath");
const fs = require("fs-extra");
const pkgJson = require("../../package.json");

/**
 * Searches for a script file by name in the specified directory
 * @function findScript
 * @param {string} scriptName - The name of the script to find (without extension)
 * @param {string|null} [searchDir=null] - The directory to search in. Defaults to the parent `src` directory when not provided
 * @returns {string|undefined} The absolute path to the found script file, or undefined if not found
 */
function findScript(scriptName, searchDir = null) {
  if (!searchDir) searchDir = path.join(__dirname, "..");
  let result;

  // Define ignore patterns for library config and utils
  const ignorePatterns = [
    `**/*config*.{cjs,js,mjs}`,
    `**/utils.{cjs,js,mjs}`,
    `**/index.{cjs,js,mjs}`,
    `**/chunk-*.{cjs,js,mjs}`,
    `**/*.d.{ts,cts,mts}` // ignore TypeScript declaration files
  ];

  try {
    const pattern = `${scriptName}.{cjs,js,mjs}`;
    const files = glob.sync(pattern, {
      cwd: searchDir,
      ignore: ignorePatterns,
      absolute: true
    });

    if (files.length > 0) {
      result = files[0];
    } else {
      if (pkgJson.bin[scriptName]) {
        const find = [
          path.join(searchDir, pkgJson.bin[scriptName]),
          path.join(process.cwd(), "node_modules/binary-collections", pkgJson.bin[scriptName]),
          path.join(__dirname, pkgJson.bin[scriptName]),
          path.join(path.join(__dirname, ".."), pkgJson.bin[scriptName])
        ];
        const filtered = find.filter((file) => fs.existsSync(file));
        if (filtered.length > 0) {
          result = filtered[0];
        } else {
          console.warn(`⚠️  Script "${scriptName}" not found in ${searchDir}.`);
          console.warn(`🔍 Searched for: ${pattern} in ${searchDir}`);
        }
      }
    }
  } catch (error) {
    console.error(`🔍 Error searching for script: ${error.message}`);
  }

  // Find *-cli* file if exists
  if (result && !result.includes("-cli")) {
    const ext = path.extname(result);
    const filename = path.basename(result, ext);
    const cliFile = path.join(path.dirname(result), `${filename}-cli${ext}`);
    if (fs.existsSync(cliFile)) {
      result = cliFile;
      console.log(`🔍 Found CLI version: ${cliFile}`);
    }
  }

  return result;
}

module.exports = findScript;
module.exports.default = findScript;
