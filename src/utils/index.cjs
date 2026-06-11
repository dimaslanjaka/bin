const fs = require('fs');
const path = require('upath');
const minimistLib = require('minimist');
const argv = minimistLib(process.argv.slice(2));
const { exec } = require('child_process');
const { promisify } = require('util');

/**
 * Promisified version of Node.js exec function for async shell command execution.
 * @type {(command: string) => Promise<{ stdout: string, stderr: string }>}
 */
const execAsync = promisify(exec);

async function parseGitRemotes() {
  try {
    // Run the `git remote -v` command
    const { stdout } = await execAsync('git remote -v');
    // Split the output into lines
    const lines = stdout.split('\n');
    // Object to hold the remotes
    const remotes = {};
    // Process each line
    lines.forEach((line) => {
      const [name, url] = line.split('\t');
      if (name && url) {
        const [repoUrl] = url.split(' ');
        try {
          // Parse the URL
          const parsedUrl = new URL(repoUrl);
          // Extract the path from the URL
          const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
          // Check if the URL is from GitHub and has the username/repo format
          if (parsedUrl.hostname === 'github.com' && pathParts.length === 2) {
            // Remove the `.git` suffix if present
            let repoPath = pathParts.join('/');
            if (repoPath.endsWith('.git')) {
              repoPath = repoPath.slice(0, -4); // Remove the `.git` suffix
            }
            remotes[name] = repoPath;
          }
        } catch (e) {
          console.error('URL Parsing Error:', e.message);
        }
      }
    });
    return remotes;
  } catch (error) {
    console.error('Error:', error.message);
    return {};
  }
}
module.exports.parseGitRemotes = parseGitRemotes;

/**
 * Returns parsed command line arguments using minimist.
 * @param {import('minimist').Opts} [opts] Optional minimist options for custom parsing.
 * @returns {import('minimist').ParsedArgs} Parsed command line arguments
 */
function getArgs(opts) {
  if (opts) {
    return minimistLib(process.argv.slice(2), opts);
  }
  return argv;
}
module.exports.getArgs = getArgs;

/**
 * Recursively deletes a file or directory at the given path.
 * @param {string} fullPath Absolute path to the file or directory to delete.
 */
function del(fullPath) {
  try {
    if (!fs.existsSync(fullPath)) return;
    const stat = fs.lstatSync(fullPath);
    // If this is a symlink, remove the link only and don't follow into target
    if (stat.isSymbolicLink()) {
      try {
        fs.unlinkSync(fullPath);
        console.log('deleted symlink', fullPath);
      } catch (e) {
        console.log('failed delete symlink', fullPath, e && e.message);
      }
      return;
    }

    if (stat.isDirectory()) {
      // delete all files each package directory (do not follow symlinks)
      const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
      for (let i = 0; i < subdir.length; i++) {
        del(subdir[i]);
      }
      // remove the now-empty directory
      try {
        fs.rmdirSync(fullPath);
        console.log('deleted', fullPath);
      } catch (_e) {
        // fallback to rmSync for older Node versions or non-empty dirs
        try {
          fs.rmSync(fullPath, { recursive: true, force: true, retryDelay: 7000 });
          console.log('deleted', fullPath);
        } catch (ee) {
          console.log('failed delete', fullPath, ee && ee.message);
        }
      }
      return;
    }

    // File or other: remove
    try {
      fs.unlinkSync(fullPath);
      console.log('deleted', fullPath);
    } catch (_e) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true, retryDelay: 7000 });
        console.log('deleted', fullPath);
      } catch (ee) {
        console.log('failed delete', fullPath, ee && ee.message);
      }
    }
  } catch (err) {
    console.log('failed delete', fullPath, err && err.message);
  }
}
module.exports.del = del;

/**
 * Handles a glob stream to delete matched files and directories recursively.
 * @param {glob.Glob} globStream Glob stream object.
 */
function delStream(globStream) {
  globStream.stream().on('data', (result) => {
    const fullPath = path.resolve(process.cwd(), result);
    try {
      if (fs.existsSync(fullPath)) {
        const stat = fs.lstatSync(fullPath);
        if (stat.isSymbolicLink()) {
          // remove the symlink only
          try {
            fs.unlinkSync(fullPath);
            console.log('deleted symlink', fullPath);
          } catch (e) {
            console.log('failed delete symlink', fullPath, e && e.message);
          }
          return;
        }
        if (stat.isDirectory()) {
          const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
          for (let i = 0; i < subdir.length; i++) {
            del(subdir[i]);
          }
        }
      }
      del(fullPath);
    } catch (err) {
      console.log('failed processing', fullPath, err && err.message);
    }
  });
}
module.exports.delStream = delStream;

const getFileTreeString = require('./getFileTreeString.cjs');
module.exports.getFileTreeString = getFileTreeString;

/**
 * Creates an async delay for the specified number of milliseconds.
 * @param {number} ms Number of milliseconds to delay.
 * @returns {Promise<void>} Promise that resolves after the specified delay.
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
module.exports.delay = delay;

// Provide a "default" alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
