#!/usr/bin/env node

const { spawnSync } = require("child_process");

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load .env using dotenv from process.cwd()
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

// Parse CLI args
const args = process.argv.slice(2);

let ROOT = runGit(["rev-parse", "--show-toplevel"]).trim();
let REPO_PATH = ROOT;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "-cwd" && args[i + 1]) {
    ROOT = path.resolve(args[++i]);
  } else if (args[i].startsWith("--cwd=")) {
    ROOT = path.resolve(args[i].split("=")[1]);
  }
}

console.log(`Installing submodules at ${ROOT}`);

// Get submodule paths
const submoduleList = runGit([
  "-C",
  REPO_PATH,
  "config",
  "-f",
  ".gitmodules",
  "--get-regexp",
  "^submodule\\..*\\.path$"
])
  .split("\n")
  .filter(Boolean);

for (const line of submoduleList) {
  const [KEY, MODULE_PATH] = line.trim().split(/\s+/);
  const RELATIVE_MODULE_PATH = path.join(ROOT, MODULE_PATH);

  if (fs.existsSync(RELATIVE_MODULE_PATH)) {
    console.log(`Deleting ${RELATIVE_MODULE_PATH}`);
    fs.rmSync(RELATIVE_MODULE_PATH, { recursive: true, force: true });
  }

  const NAME = KEY.match(/^submodule\.(.*)\.path$/)[1];
  const URL = runGit(["config", "-f", ".gitmodules", "--get", `submodule.${NAME}.url`]).trim();

  let BRANCH = "master";
  try {
    BRANCH = runGit(["config", "-f", ".gitmodules", "--get", `submodule.${NAME}.branch`]).trim();
  } catch {
    // silently ignore if branch is not set
  }

  const addResult = runGit(
    ["-C", REPO_PATH, "submodule", "add", "--force", "-b", BRANCH, "--name", NAME, URL, MODULE_PATH],
    true
  );

  if (addResult.status !== 0) {
    console.warn(`Cannot add submodule ${MODULE_PATH}`);
    continue;
  }

  const GIT_MODULES = path.join(RELATIVE_MODULE_PATH, ".gitmodules");

  if (process.env.ACCESS_TOKEN) {
    let URL_WITH_TOKEN = "";
    let repoInfo;

    if (URL.includes("github.com")) {
      repoInfo = URL.replace("https://github.com/", "");
      URL_WITH_TOKEN = `https://${process.env.ACCESS_TOKEN}@github.com/${repoInfo}`;
    } else if (URL.includes("gitlab.com") && typeof process.env.GITLAB_TOKEN === "string") {
      repoInfo = URL.replace("https://gitlab.com/", "");
      URL_WITH_TOKEN = `https://oauth2:${process.env.ACCESS_TOKEN}@gitlab.com/${repoInfo}`;
    } else {
      // For other Git providers, try a generic approach
      const urlObj = new URL(URL);
      repoInfo = urlObj.pathname.substring(1); // Remove leading slash
      URL_WITH_TOKEN = `${urlObj.protocol}//${process.env.ACCESS_TOKEN}@${urlObj.host}${urlObj.pathname}`;
    }

    if (URL_WITH_TOKEN && URL_WITH_TOKEN.length > 0) {
      console.log(`Apply token for ${repoInfo} at ${MODULE_PATH} branch ${BRANCH}`);
      runGit(["-C", RELATIVE_MODULE_PATH, "remote", "set-url", "origin", URL_WITH_TOKEN]);
    }
  }

  runGit(["-C", RELATIVE_MODULE_PATH, "fetch", "--all"]);
  runGit(["-C", RELATIVE_MODULE_PATH, "pull", "origin", BRANCH, "-X", "theirs"]);

  if (fs.existsSync(GIT_MODULES)) {
    console.log(`${MODULE_PATH} has submodules`);
    const result = spawnSync("node", [__filename, "-cwd", RELATIVE_MODULE_PATH], { stdio: "inherit" });
    if (result.status !== 0) {
      console.error(`Recursive submodule failed for ${RELATIVE_MODULE_PATH}`);
      process.exit(result.status);
    }
  }
}

runGit(["-C", REPO_PATH, "submodule", "update", "--init", "--recursive"]);

// ----------- Helper Functions -----------

function runGit(args, returnResult = false) {
  const result = spawnSync("git", args, { encoding: "utf-8" });

  if (returnResult) return result;

  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  }

  return result.stdout || "";
}
