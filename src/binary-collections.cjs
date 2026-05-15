#!/usr/bin/env node

const { spawn } = require("child_process");
const { glob } = require("glob");
const path = require("upath");
const { getArgs } = require("./utils/index.cjs");
const pkgJson = require("../package.json");
const fs = require("fs-extra");

/**
 * Main binary-collections script that dynamically finds and executes other scripts
 * Usage: npx binary-collections <script-name> [...args]
 * Example: npx binary-collections git-diff -s
 */

/**
 * Displays help information and usage instructions for the binary-collections tool
 * @function showHelp
 * @returns {void} Exits the process after displaying help
 */
function showHelp() {
  console.log("🚀 Binary Collections - Dynamic Script Runner");
  console.log("═══════════════════════════════════════════════");
  console.log("");
  console.log("📋 Usage: npx binary-collections <script-name> [...args]");
  console.log("");
  console.log("✨ Examples:");
  console.log("  📊 npx binary-collections git-diff -s");
  console.log("  🧹 npx binary-collections del-node-modules");
  console.log("  🔍 npx binary-collections find-node-modules --help");
  console.log("");
  console.log("ℹ️  This tool will search for <script-name>.{cjs,js,mjs} in the script's directory");
  console.log("   and execute it with the provided arguments.");
  console.log("");
  console.log("⚙️  Options:");
  console.log("  --help, -h    Show this help message");
  process.exit(0);
}

/**
 * Searches for a script file by name in the specified directory
 * @function findScript
 * @param {string} scriptName - The name of the script to find (without extension)
 * @param {string|null} [searchDir=null] - The directory to search in. Defaults to __dirname if not provided
 * @returns {string|undefined} The absolute path to the found script file, or undefined if not found
 */
function findScript(scriptName, searchDir = null) {
  if (!searchDir) searchDir = __dirname;
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
    // Use glob to find script files, excluding ignored patterns
    // Use cwd option for better path handling
    const pattern = `${scriptName}.{cjs,js,mjs}`;
    const files = glob.sync(pattern, {
      cwd: searchDir,
      ignore: ignorePatterns,
      absolute: true
    });

    if (files.length > 0) {
      // Return the first match if found
      result = files[0];
    } else {
      // If not found pick from pkg.bin[scriptName] when exist
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

/**
 * Executes a script file using Node.js with the provided arguments
 * @function executeScript
 * @param {string} scriptPath - The absolute path to the script file to execute
 * @param {string[]} args - Array of arguments to pass to the script
 * @returns {void} Exits the process when the script execution completes
 */
function executeScript(scriptPath, args) {
  console.log(`🔧 Executing script: ${scriptPath} args: ${args.join(" ")}`);
  const child = spawn("node", [scriptPath, ...args], {
    stdio: "inherit",
    shell: true
  });

  child.on("error", (error) => {
    console.error(`❌ Error executing script: ${error.message}`);
    process.exit(1);
  });

  child.on("close", (code) => {
    process.exit(code);
  });
}

/**
 * Main entry point of the binary-collections script
 * Parses command line arguments, finds the requested script, and executes it
 * @function main
 * @returns {void} Exits the process after executing the script or showing help
 */
function main() {
  const args = getArgs();
  const positional = args._ || [];
  // console.log(`🔍 Parsed arguments: ${JSON.stringify(args)}`);

  // Show help if no script name is provided (covers both `bc` and `bc -h` cases)
  if (positional.length === 0) {
    return showHelp();
  }

  const scriptName = positional[0];
  // console.log(`🔍 Looking for script: ${scriptName}`);

  // Reconstruct all arguments except the script name
  // Include both positional arguments and flags
  const scriptArgs = [];

  // Add remaining positional arguments
  scriptArgs.push(...positional.slice(1));

  // Add flag arguments back
  Object.keys(args).forEach((key) => {
    if (key !== "_") {
      const value = args[key];
      if (typeof value === "boolean" && value) {
        // Add boolean flags like -s, --help, -h
        scriptArgs.push(key.length === 1 ? `-${key}` : `--${key}`);
      } else if (value !== true && value !== false) {
        // Add flags with values like --output=file.txt
        scriptArgs.push(key.length === 1 ? `-${key}` : `--${key}`);
        scriptArgs.push(value);
      }
    }
  });

  // Find the script in current directory
  const scriptPath = findScript(scriptName);

  if (!scriptPath) {
    console.error(`❌ Error: Script "${scriptName}" not found.`);
    console.error(`🔍 Searched for: ${scriptName}.{cjs,js,mjs} in ${__dirname}`);
    console.error("");
    console.error("📝 Available extensions: .cjs, .js, .mjs");
    process.exit(1);
  }

  // Show relative path from current working directory
  const relativePath = path.relative(process.cwd(), scriptPath);
  console.log(`✅ Found script: ${relativePath}`);
  executeScript(scriptPath, scriptArgs);
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️  Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

main();
