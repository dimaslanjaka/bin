const path = require("path");
const fs = require("fs");
const os = require("os");
const minimist = require("minimist");

const { runBash } = require("./utils/runBash.cjs");
const { bashScript } = require("./rm-node-modules.cjs");

const argv = minimist(process.argv.slice(2), {
  boolean: ["h", "help"],
  alias: {
    h: "help"
  }
});

if (argv.help) {
  console.log(`
rm-node-modules

Usage:
  rm-node-modules [options]

Examples:
  node src/rm-node-module-cli.cjs
  npx binary-collections rm-node-modules

Options:
  -h, --help     Show this help message

Description:
  Removes node_modules subfolders by first-letter in parallel to speed up
  deletions. The script writes a temporary shell script and executes it; the
  temporary script is removed after completion. On Windows, this requires a
  Unix-compatible shell in PATH (e.g., Git Bash or WSL).
`);
  process.exit(0);
}

const cachePath = path.join(os.tmpdir(), "rm-node-modules-cache.json");

const createdScripts = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf-8")) : [];

async function cleanUp(rootDir) {
  const filename = `${path.basename(__filename, path.extname(__filename))}-${process.pid}.sh`;
  const scriptPath = path.join(rootDir, filename);

  fs.writeFileSync(scriptPath, bashScript, { mode: 0o755 });

  createdScripts.push(scriptPath);
  fs.writeFileSync(cachePath, JSON.stringify(createdScripts, null, 2));
  try {
    const result = await runBash(scriptPath, {
      cwd: rootDir,
      stdio: "inherit"
    });
    return result;
  } catch (e) {
    console.error(`Error executing cleanup script (${scriptPath}):`, e);
    throw e;
  } finally {
    // Clean up created scripts
    for (const script of createdScripts) {
      if (fs.existsSync(script)) {
        try {
          fs.unlinkSync(script);
        } catch (unlinkErr) {
          // Log but do not mask the original error
          console.error(`Failed to remove temporary script ${script}:`, unlinkErr);
        }
      }
    }
  }
}

cleanUp(process.cwd());
