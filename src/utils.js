const fs = require("fs");
const path = require("upath");
const argv = require("minimist")(process.argv.slice(2));
const { exec } = require("child_process");
const { URL } = require("url");
const { promisify } = require("util");

/** Promisify exec  */
const execAsync = promisify(exec);

async function parseGitRemotes() {
  try {
    // Run the `git remote -v` command
    const { stdout } = await execAsync("git remote -v");
    // Split the output into lines
    const lines = stdout.split("\n");
    // Object to hold the remotes
    const remotes = {};
    // Process each line
    lines.forEach((line) => {
      const [name, url] = line.split("\t");
      if (name && url) {
        const [repoUrl] = url.split(" ");
        try {
          // Parse the URL
          const parsedUrl = new URL(repoUrl);
          // Extract the path from the URL
          const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
          // Check if the URL is from GitHub and has the username/repo format
          if (parsedUrl.hostname === "github.com" && pathParts.length === 2) {
            // Remove the `.git` suffix if present
            let repoPath = pathParts.join("/");
            if (repoPath.endsWith(".git")) {
              repoPath = repoPath.slice(0, -4); // Remove the `.git` suffix
            }
            remotes[name] = repoPath;
          }
        } catch (e) {
          console.error("URL Parsing Error:", e.message);
        }
      }
    });
    return remotes;
  } catch (error) {
    console.error("Error:", error.message);
    return {};
  }
}
module.exports.parseGitRemotes = parseGitRemotes;

/**
 * Joins all given path segments together and normalizes the resulting path.
 * Preserves the case of the drive letter on Windows.
 *
 * @param {...string} segments - The path segments to join.
 * @returns {string} - The normalized path with the drive letter case preserved.
 */
function joinPathPreserveDriveLetter(...segments) {
  let fullPath = require("path").join(...segments);
  // Check if the path starts with a drive letter (e.g., C:\)
  if (/^[a-z]:\\/.test(fullPath)) {
    // Convert the drive letter to uppercase
    fullPath = fullPath.charAt(0).toUpperCase() + fullPath.slice(1);
  }
  return fullPath;
}
module.exports.joinPathPreserveDriveLetter = joinPathPreserveDriveLetter;

/**
 * Get command line arguments
 * @returns {import('minimist').ParsedArgs} Parsed command line arguments
 */
function getArgs() {
  return argv;
}
module.exports.getArgs = getArgs;

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
module.exports.del = del;

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
module.exports.delStream = delStream;

/**
 * Creates a directory/file tree string from a hash array of file paths and hashes.
 * @param {string[]} hashArray - Array of strings in the format 'relative/path/to/file hash'.
 * @returns {string} The directory/file tree as a string, with file hashes.
 */
function getFileTreeString(hashArray) {
  const tree = {};
  // Map file paths to hashes for quick lookup
  const hashMap = {};
  for (const entry of hashArray) {
    const [filePath, hash] = entry.split(" ");
    hashMap[filePath] = hash;
    const parts = filePath.split("/");
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = null; // file
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    }
  }
  function printNode(node, prefix = "", parentPath = "") {
    const keys = Object.keys(node).sort();
    let lines = [];
    keys.forEach((key, idx) => {
      const isLast = idx === keys.length - 1;
      const branch = isLast ? "└── " : "├── ";
      const currentPath = parentPath ? parentPath + "/" + key : key;
      if (node[key] === null) {
        lines.push(prefix + branch + key + " [" + (hashMap[currentPath] || "") + "]");
      } else {
        lines.push(prefix + branch + key + "/");
        lines = lines.concat(printNode(node[key], prefix + (isLast ? "    " : "│   "), currentPath));
      }
    });
    return lines;
  }
  return printNode(tree, "", "").join("\n");
}
module.exports.getFileTreeString = getFileTreeString;

/**
 * Create an async delay for the specified number of milliseconds
 * @param {number} ms - Number of milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after the specified delay
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
module.exports.delay = delay;
