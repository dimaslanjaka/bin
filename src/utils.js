const fs = require("fs");
const path = require("upath");
const argv = require("minimist")(process.argv.slice(2));

/**
 * Get command line arguments
 * @returns {object} Parsed command line arguments
 */
function getArgs() {
  return argv;
}

/**
 * Delete file or directory recursively
 * @param {string} fullPath - The full path to the file or directory to delete
 */
function del(fullPath) {
  if (fs.statSync(fullPath).isDirectory()) {
    // delete all files each package directory
    const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
    for (let i = 0; i < subdir.length; i++) {
      del(subdir[i]);
    }
  } else {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true, retryDelay: 7000 });
      console.log("deleted", fullPath);
    } catch (_) {
      console.log("failed delete", fullPath);
    }
  }
}

/**
 * Handle glob stream to delete matched files and directories
 * @param {glob.Glob} globStream - The glob stream object
 */
function delStream(globStream) {
  globStream.stream().on("data", (result) => {
    const fullPath = path.resolve(process.cwd(), result);
    if (fs.statSync(fullPath).isDirectory()) {
      // delete all files each package directory
      const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
      for (let i = 0; i < subdir.length; i++) {
        del(subdir[i]);
      }
    }
    del(fullPath);
  });
}

/**
 * Create an async delay for the specified number of milliseconds
 * @param {number} ms - Number of milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after the specified delay
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { del, delStream, getArgs, delay };
