#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

/**
 * Main binary-collections script that dynamically finds and executes other scripts
 * Usage: npx binary-collections <script-name> [...args]
 * Example: npx binary-collections git-diff -s
 */

function showHelp() {
  console.log("Binary Collections - Dynamic Script Runner");
  console.log("==========================================");
  console.log("");
  console.log("Usage: npx binary-collections <script-name> [...args]");
  console.log("");
  console.log("Examples:");
  console.log("  npx binary-collections git-diff -s");
  console.log("  npx binary-collections del-node-modules");
  console.log("  npx binary-collections find-node-modules --help");
  console.log("");
  console.log("This tool will search for <script-name>.{cjs,js,mjs} in the script's directory");
  console.log("and execute it with the provided arguments.");
  console.log("");
  console.log("Options:");
  console.log("  --help, -h    Show this help message");
  process.exit(0);
}

function findScript(scriptName, searchDir = null) {
  if (!searchDir) searchDir = __dirname;
  const extensions = ["cjs", "js", "mjs"];

  for (const ext of extensions) {
    const scriptPath = path.join(searchDir, `${scriptName}.${ext}`);
    if (fs.existsSync(scriptPath)) {
      return scriptPath;
    }
  }

  return null;
}

function executeScript(scriptPath, args) {
  console.log(`Executing: node "${scriptPath}" ${args.join(" ")}`);

  const child = spawn("node", [scriptPath, ...args], {
    stdio: "inherit",
    shell: true
  });

  child.on("error", (error) => {
    console.error(`Error executing script: ${error.message}`);
    process.exit(1);
  });

  child.on("close", (code) => {
    process.exit(code);
  });
}

function main() {
  const args = process.argv.slice(2);

  // Show help if no arguments or help flags
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showHelp();
  }

  const scriptName = args[0];
  const scriptArgs = args.slice(1);

  // Find the script in current directory
  const scriptPath = findScript(scriptName);

  if (!scriptPath) {
    console.error(`Error: Script "${scriptName}" not found.`);
    console.error(`Searched for: ${scriptName}.{cjs,js,mjs} in ${__dirname}`);
    console.error("");
    console.error("Available extensions: .cjs, .js, .mjs");
    process.exit(1);
  }

  console.log(`Found script: ${scriptPath}`);
  executeScript(scriptPath, scriptArgs);
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

main();
