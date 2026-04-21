const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const os = require("os");
const minimist = require("minimist");

// ----------------------
// CLI
// ----------------------
const argv = minimist(process.argv.slice(2), {
  boolean: ["force", "help"],
  alias: { h: "help", f: "force", c: "concurrent" },
  default: { force: false, concurrent: 2 }
});

if (argv.help) {
  console.log(`Usage: clean-node [--force] [-c|--concurrent N]
By default runs in dry-run mode. Use --force to actually delete.
Use -c/--concurrent to set concurrent removals (default 2).`);
  process.exit(0);
}

const DRY_RUN = !argv.force;
const defaultConcurrency = Math.max(2, os.cpus().length || 2);
const CONCURRENCY = Math.max(1, Number(argv.concurrent || argv.c || defaultConcurrency));

// ----------------------
// CONSTANTS
// ----------------------
const customChars = "@.";
const vowels = "aeiouAEIOU";
const alnum = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const combined = alnum + vowels + customChars;

const ROOT = process.cwd();

// ----------------------
// HELPERS
// ----------------------
async function isSymlinkAsync(p) {
  try {
    return (await fsp.lstat(p)).isSymbolicLink();
  } catch {
    return false;
  }
}

async function removeAsync(target) {
  if (await isSymlinkAsync(target)) {
    console.log("Skipping symlink", target);
    return;
  }

  if (DRY_RUN) {
    console.log("Would remove", target);
    return;
  }

  try {
    await fsp.rm(target, { recursive: true, force: true });
    console.log("Deleting", target);
  } catch (e) {
    console.error("Failed:", target, e.message);
  }
}

function runWithConcurrency(tasks, concurrency) {
  return new Promise((resolve, reject) => {
    let i = 0;
    let active = 0;
    let done = 0;
    const total = tasks.length;
    if (total === 0) return resolve();

    function next() {
      if (done === total) return resolve();
      while (active < concurrency && i < total) {
        const idx = i++;
        active++;
        Promise.resolve()
          .then(() => tasks[idx]())
          .then(() => {
            active--;
            done++;
            next();
          })
          .catch((err) => reject(err));
      }
    }

    next();
  });
}

// `removeAsync` is the single deletion path; synchronous removals were
// removed in favor of collecting targets and executing them with
// `runWithConcurrency` so all deletions respect `DRY_RUN` and concurrency.

/**
 * Walk (no symlink traversal)
 */
function walk(dir, callback, { skipNodeModulesChildren = false } = {}) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // 🚫 never follow symlinks
    if (entry.isSymbolicLink()) continue;

    // skip inside node_modules/*
    if (skipNodeModulesChildren && dir.includes("node_modules")) continue;

    callback(fullPath, entry);

    if (entry.isDirectory()) {
      if (skipNodeModulesChildren && entry.name === "node_modules") {
        continue;
      }
      walk(fullPath, callback, { skipNodeModulesChildren });
    }
  }
}

// ----------------------
// NODE_MODULES HANDLER
// ----------------------
async function processNodeModules(dir) {
  console.log("Found:", dir);

  let items;
  try {
    items = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  // determine targets whose first char is in the allowed combined set
  const targets = items.filter((entry) => entry.name.length && combined.includes(entry.name[0]));

  const tasks = targets.map((entry) => async () => {
    const name = entry.name;
    const target = path.join(dir, name);

    // 🚫 skip symlinks entirely (Dirent gives this cheaply)
    if (entry.isSymbolicLink && entry.isSymbolicLink()) {
      console.log("Skipping symlink", target);
      return;
    }

    await removeAsync(target);
  });

  // run with limited concurrency
  await runWithConcurrency(tasks, CONCURRENCY);

  await removeAsync(dir);
}

// ----------------------
// MAIN
// ----------------------
async function main() {
  const nodeModulesDirs = [];

  // find node_modules
  walk(ROOT, (fullPath, entry) => {
    if (entry.isDirectory() && entry.name === "node_modules") {
      nodeModulesDirs.push(fullPath);
    }
  });

  for (const dir of nodeModulesDirs) {
    // process each node_modules directory, await to avoid too many parallel top-level ops
    // (internals already limit concurrency)

    await processNodeModules(dir);
  }

  // collect package/yarn targets then remove them with concurrency
  const packageLocks = [];
  const yarnLocks = [];
  const yarnCaches = [];

  walk(
    ROOT,
    (fullPath, entry) => {
      const base = path.basename(fullPath);
      if (base === "package-lock.json") packageLocks.push(fullPath);
      if (base === "yarn.lock") yarnLocks.push(fullPath);
      if (entry.isDirectory() && fullPath.endsWith(path.join(".yarn", "cache"))) yarnCaches.push(fullPath);
    },
    { skipNodeModulesChildren: true }
  );

  if (DRY_RUN) {
    console.log("Would remove package-lock.json files:");
    for (const p of packageLocks) console.log(p);
    console.log("Would remove yarn.lock files:");
    for (const p of yarnLocks) console.log(p);
    console.log("Would remove .yarn/cache directories:");
    for (const p of yarnCaches) console.log(p);
  } else {
    const allTasks = [];
    allTasks.push(...packageLocks.map((p) => async () => removeAsync(p)));
    allTasks.push(...yarnLocks.map((p) => async () => removeAsync(p)));
    allTasks.push(...yarnCaches.map((p) => async () => removeAsync(p)));
    await runWithConcurrency(allTasks, CONCURRENCY);
  }
}

main();
