#!/usr/bin/env node
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  __dirname,
  __filename,
  init_esm_shims
} from "./chunk-VXZQNLPU.mjs";
import {
  __commonJS,
  __require
} from "./chunk-FB6YIQYR.mjs";

// src/submodule-install.cjs
var require_submodule_install = __commonJS({
  "src/submodule-install.cjs"() {
    init_esm_shims();
    var { spawnSync } = __require("child_process");
    var fs = __require("fs");
    var path = __require("path");
    var envPath = path.resolve(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      envContent.split("\n").forEach((line) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith("#")) return;
        const [key, ...vals] = trimmedLine.split("=");
        if (!key) return;
        const value = vals.join("=").trim().replace(/^['"]|['"]$/g, "");
        process.env[key.trim()] = value;
      });
    }
    var args = process.argv.slice(2);
    var ROOT = runGit(["rev-parse", "--show-toplevel"]).trim();
    var REPO_PATH = ROOT;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-cwd" && args[i + 1]) {
        ROOT = path.resolve(args[++i]);
      } else if (args[i].startsWith("--cwd=")) {
        ROOT = path.resolve(args[i].split("=")[1]);
      }
    }
    console.log(`Installing submodules at ${ROOT}`);
    var submoduleList = runGit([
      "-C",
      REPO_PATH,
      "config",
      "-f",
      ".gitmodules",
      "--get-regexp",
      "^submodule\\..*\\.path$"
    ]).split("\n").filter(Boolean);
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
      }
      const addResult = runGit(
        ["-C", REPO_PATH, "submodule", "add", "--force", "-b", BRANCH, "--name", NAME, URL, MODULE_PATH],
        true
      );
      if (addResult.status !== 0) {
        console.warn(`Cannot add submodule ${MODULE_PATH}`);
        continue;
      }
      const repo = URL.replace("https://github.com/", "");
      const GIT_MODULES = path.join(RELATIVE_MODULE_PATH, ".gitmodules");
      if (process.env.ACCESS_TOKEN) {
        const URL_WITH_TOKEN = `https://${process.env.ACCESS_TOKEN}@github.com/${repo}`;
        console.log(`Apply token for ${repo} at ${MODULE_PATH} branch ${BRANCH}`);
        runGit(["-C", RELATIVE_MODULE_PATH, "remote", "set-url", "origin", URL_WITH_TOKEN]);
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
    function runGit(args2, returnResult = false) {
      const result = spawnSync("git", args2, { encoding: "utf-8" });
      if (returnResult) return result;
      if (result.status !== 0) {
        throw new Error(result.stderr || `git ${args2.join(" ")} failed`);
      }
      return result.stdout || "";
    }
  }
});
export default require_submodule_install();
