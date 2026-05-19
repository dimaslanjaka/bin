const cp = require("cross-spawn");
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");

const workspaces = [
  {
    name: "workspace-a",
    url: "https://github.com/dimaslanjaka/hexo-is/"
  },
  {
    name: "workspace-b",
    url: "https://github.com/dimaslanjaka/hexo-themes/"
  }
];

const baseDir = path.join(__dirname, "workspaces");

async function ensureCleanDir(dir) {
  const exists = fsSync.existsSync(dir);

  if (!exists) return;

  const isGitRepo = fsSync.existsSync(path.join(dir, ".git"));

  if (!isGitRepo) {
    console.warn(`Removing non-git directory: ${dir}`);
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function runGitClone(url, targetDir) {
  return new Promise((resolve, reject) => {
    const child = cp.spawn("git", ["clone", "--branch", "master", "--single-branch", url, targetDir], {
      stdio: "inherit",
      cwd: __dirname
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git clone failed (${code}) for ${url}`));
    });

    child.on("error", reject);
  });
}

async function cloneWorkspace({ name, url }) {
  const targetDir = path.join("workspaces", name);
  const fullPath = path.join(baseDir, name);

  console.log(`\n==> Processing ${name}`);

  await ensureCleanDir(fullPath);

  if (fsSync.existsSync(fullPath) && fsSync.existsSync(path.join(fullPath, ".git"))) {
    console.log(`✔ ${name} already exists, skipping`);
    return;
  }

  console.log(`Cloning ${name}...`);
  await runGitClone(url, targetDir);
  console.log(`✔ Cloned ${name}`);
}

async function cloneWorkspaces() {
  for (const ws of workspaces) {
    await cloneWorkspace(ws);
  }
}

cloneWorkspaces().catch(console.error);
