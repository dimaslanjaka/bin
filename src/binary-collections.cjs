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

function findScript(scriptName, searchDir = null) {
  if (!searchDir) searchDir = __dirname;

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
      return files[0];
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
          return filtered[0];
        } else {
          console.warn(`⚠️  Script "${scriptName}" not found in ${searchDir}.`);
          console.warn(`🔍 Searched for: ${pattern} in ${searchDir}`);
        }
      }
    }
  } catch (error) {
    console.error(`🔍 Error searching for script: ${error.message}`);
  }

  return null;
}

function executeScript(scriptPath, args) {
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

function main() {
  const args = getArgs();
  const positional = args._ || [];

  // Show help if no arguments or if help is requested without a script name
  if (positional.length === 0 || (positional.length === 1 && (args.help || args.h))) {
    showHelp();
  }

  const scriptName = positional[0];
  const scriptArgs = positional.slice(1);

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
