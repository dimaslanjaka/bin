const { spawn } = require("child_process");

/**
 * Executes a script file using Node.js with the provided arguments
 * @function executeScript
 * @param {string} scriptPath - The absolute path to the script file to execute
 * @param {string[]} args - Array of arguments to pass to the script
 * @returns {void} Exits the process when the script execution completes
 */
function executeScript(scriptPath, args) {
  console.log(`🔧 Executing script: ${scriptPath} args: ${args.join(" ")}\n`);
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

module.exports = executeScript;
module.exports.default = executeScript;
