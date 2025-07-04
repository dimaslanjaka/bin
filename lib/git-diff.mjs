#!/usr/bin/env node
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  init_esm_shims
} from "./chunk-VXZQNLPU.mjs";
import {
  __commonJS,
  __require
} from "./chunk-FB6YIQYR.mjs";

// src/git-diff.cjs
var require_git_diff = __commonJS({
  "src/git-diff.cjs"() {
    init_esm_shims();
    var { execSync } = __require("child_process");
    var fs = __require("fs");
    var path = __require("path");
    var CACHE_DIR = ".cache/git";
    var OUTPUT = path.join(CACHE_DIR, "diff.txt");
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    function showHelp() {
      console.log("Git Diff Helper");
      console.log("----------------------------");
      console.log("Usage:");
      console.log("  git-diff FILE             Show staged diff of specified file");
      console.log("  git-diff --staged-only    Show staged diff of all files");
      console.log("  git-diff -s | -S          Same as --staged-only");
      console.log("  git-diff --help | -h      Show this help message");
      console.log("");
      console.log(`Output is saved to: ${OUTPUT}`);
      process.exit(0);
    }
    function runGitDiff(command, successMessage, errorMessage) {
      try {
        console.log(`[i] Running command: ${command}`);
        const result = execSync(command, { encoding: "utf8" });
        if (!result || result.trim() === "") {
          console.log(`[i] No changes found for the specified criteria`);
          fs.writeFileSync(OUTPUT, "# No changes found\n");
          console.log(`[\u2713] Empty diff saved to "${OUTPUT}"`);
          return;
        }
        fs.writeFileSync(OUTPUT, result);
        console.log(`[\u2713] ${successMessage}`);
      } catch (error) {
        console.error(`[\u2717] ${errorMessage}`);
        console.error(`Command: ${command}`);
        console.error(`Error: ${error.message}`);
        if (error.message.includes("not a git repository")) {
          console.error("Make sure you are in a git repository");
        }
        process.exit(1);
      }
    }
    var args = process.argv.slice(2);
    if (args[0] === "--help" || args[0] === "-h") {
      showHelp();
    }
    switch (args[0]) {
      case "--staged-only":
      case "-s":
      case "-S":
        runGitDiff("git --no-pager diff --staged", `Full staged diff saved to "${OUTPUT}"`, "Failed to save staged diff");
        break;
      default: {
        const file = args[0];
        if (!file) {
          runGitDiff("git --no-pager diff", `Full staged diff saved to "${OUTPUT}"`, "Failed to save all diff's");
        } else {
          runGitDiff(
            `git --no-pager diff --cached -- "${file}"`,
            `Staged diff of "${file}" saved to "${OUTPUT}"`,
            `Failed to generate diff for "${file}"`
          );
        }
        break;
      }
    }
  }
});
export default require_git_diff();
