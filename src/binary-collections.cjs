#!/usr/bin/env node

const path = require("upath");
const { getArgs } = require("./utils/index.cjs");
const findScript = require("./binary-collections/findScript.cjs");
const executeScript = require("./binary-collections/executeScript.cjs");

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
