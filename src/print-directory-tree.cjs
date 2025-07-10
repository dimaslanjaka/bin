const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const glob = require("glob");
const { getArgs } = require("./utils.js");
const sbgUtil = require("sbg-utility");
const dotenv = require("dotenv");

const projectDir = process.cwd();
const envPath = path.join(projectDir, ".env");

// Load the .env file using dotenv (ESM import)
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

// Parse CLI arguments
const argv = getArgs();

// Main logic wrapped in an async function
async function main() {
  // Determine output file from CLI args
  let relativeOutputFile = "tmp/directory-structure.txt";
  if (argv.output || argv.o) {
    relativeOutputFile = argv.output || argv.o;
  }
  // If not absolute, resolve relative to projectDir
  const outputFile = path.isAbsolute(relativeOutputFile)
    ? relativeOutputFile
    : path.join(projectDir, relativeOutputFile);

  // Create or clear the hash file
  sbgUtil.writefile(outputFile, "");

  /**
   * List of file extensions to include
   * @type {string[]}
   */
  let extensions = [];
  if (argv.ext) {
    extensions = argv.ext
      .split(",")
      .map((e) => e.trim().replace(/^\./, ""))
      .filter(Boolean);
  }

  // Directories to exclude
  let excludeDirs = [
    "node_modules",
    "vendor",
    "venv",
    ".venv",
    ".git",
    ".hg",
    ".svn",
    ".idea",
    ".vscode",
    "dist",
    "build",
    "out",
    "coverage",
    ".DS_Store"
  ];
  if (argv.exclude) {
    const userExcludes = argv.exclude
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    if (argv["override-exclude"] || argv.we) {
      // Override the default excludes with user-provided ones
      excludeDirs = userExcludes;
    } else {
      // Append user-provided excludes to the default ones
      excludeDirs = excludeDirs.concat(userExcludes);
    }
  }

  // Convert excludeDirs into glob ignore patterns
  const ignorePatterns = excludeDirs.map((dir) => `**/${dir}/**`);

  // Initialize an array to hold the formatted outputs
  let hashArray = [];

  // Helper function to hash and add file if not already processed
  const processedFiles = new Set();
  /**
   * Hashes a file and pushes its relative path and hash to the hashArray.
   * @param {string} file - The absolute path to the file.
   * @returns {Promise<void>} Resolves when the file has been processed and added to hashArray.
   */
  async function hashAndPush(file) {
    if (processedFiles.has(file)) return;
    processedFiles.add(file);
    let relativePath = path.relative(projectDir, file);
    relativePath = relativePath.split(path.sep).join("/");
    try {
      const stats = await fs.stat(file);
      const pseudoHash = `${stats.size}-${stats.mtimeMs}`;
      const hash = crypto.createHash("sha256").update(pseudoHash).digest("hex");
      hashArray.push(`${relativePath} ${hash.slice(0, 8)}`);
    } catch (err) {
      console.error(`Error processing file: ${file}`, err instanceof Error ? err.message : "<unknown error>");
      if (err && err.code === "ENOENT") {
        hashArray.push(`${relativePath} <file not found>`);
      } else {
        hashArray.push(`${relativePath} <error: ${err && err.code ? `code ${err.code}` : "unknown"}>`);
      }
    }
  }

  // Collect all files to process (extensions + special files)
  const initialFiles = [
    path.join(projectDir, "package.json"),
    path.join(projectDir, "composer.json"),
    path.join(projectDir, "requirements.txt")
  ];
  let patterns = [];
  if (argv.pattern) {
    if (Array.isArray(argv.pattern)) {
      patterns = argv.pattern.map((p) => p.trim()).filter(Boolean);
    } else {
      patterns = [argv.pattern.trim()];
    }
  } else if (extensions.length === 0) {
    patterns = ["**/*.*"];
  } else {
    patterns = extensions.map((ext) => `**/*.${ext}`);
  }
  const globFiles = glob.sync(patterns.length === 1 ? patterns[0] : `{${patterns.join(",")}}`, {
    cwd: projectDir,
    ignore: ignorePatterns,
    absolute: true,
    nodir: true
  });
  const allFiles = new Set([...initialFiles, ...globFiles]);

  // Hash all unique files
  await Promise.all(Array.from(allFiles).map(hashAndPush));

  // Sort the hashArray by file paths
  hashArray.sort((a, b) => a.localeCompare(b));

  /**
   * Generates a directory/file tree string from a hash array of file paths and hashes.
   *
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
    /**
     * Recursively builds the tree string for a given node.
     *
     * @param {Object} node - The current node in the tree.
     * @param {string} prefix - The prefix for the current tree level.
     * @param {string} parentPath - The path to the current node.
     * @returns {string[]} Array of lines representing the tree structure.
     */
    function printNode(node, prefix = "", parentPath = "") {
      const keys = Object.keys(node).sort();
      let lines = [];
      keys.forEach((key, idx) => {
        const isLast = idx === keys.length - 1;
        const branch = isLast ? "└── " : "├── ";
        const currentPath = parentPath ? parentPath + "/" + key : key;
        if (node[key] === null) {
          // file: show hash
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

  // Write directory/file tree to the output file (hashes are included in the tree)
  const fileTreeString = getFileTreeString(hashArray);
  await fs.writeFile(outputFile, fileTreeString + "\n", "utf-8");

  // Add the hash file to the commit if --git-add is present
  if (argv["git-add"]) {
    execSync(`git add ${relativeOutputFile}`);
    console.log(`Directory tree written to ${relativeOutputFile} and staged for git.`);
  } else {
    console.log(`Directory tree written to ${relativeOutputFile}.`);
  }
}

if (argv.help || argv.h) {
  console.log(`
Usage: node print-directory-tree.cjs [options]

Options:
  --output, -o <file>           Output file path (default: tmp/directory-structure.txt)
  --ext <exts>                  Comma-separated list of file extensions (no dot, e.g. js,ts)
  --pattern <glob>              Glob pattern(s) for files (can be repeated)
  --exclude <dirs>              Comma-separated list of directories to exclude (appends to default)
  --override-exclude, -we       Override default exclude directories with --exclude
  --git-add                     Add output file to git after writing
  --help, -h                    Show this help message

Examples:
  node print-directory-tree.cjs --ext=js,ts
  node print-directory-tree.cjs --pattern=src/**/*.js --pattern=test/**/*.js
  node print-directory-tree.cjs --exclude=dist,build
  node print-directory-tree.cjs --output=tmp/tree.txt
`);
  process.exit(0);
}

// Execute the main function
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
