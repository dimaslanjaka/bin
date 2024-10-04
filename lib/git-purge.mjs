import {
  require_dist
} from "./chunk-TRRVHZV4.mjs";
import {
  require_utils
} from "./chunk-IUQOFXK6.mjs";
import {
  init_esm_shims
} from "./chunk-S5U5CNLS.mjs";
import {
  __require
} from "./chunk-7I4CRWDS.mjs";

// src/git-purge.js
init_esm_shims();
var { spawnAsync } = require_dist();
var glob = __require("glob");
var path = __require("path");
var { delay } = require_utils();
var dirs = [];
var fetchDirs = (pattern, callback) => {
  const globStream = new glob.Glob(pattern, {
    withFileTypes: false,
    cwd: process.cwd(),
    ignore: ["**/node_modules/**", "**/vendor/**"]
  });
  globStream.stream().on("data", (result) => {
    const fullPath = path.resolve(process.cwd(), result);
    if (typeof callback == "function") callback(fullPath);
    const base = path.dirname(fullPath);
    if (!dirs.includes(base)) dirs.push(base);
    start();
  });
};
var running = false;
async function start() {
  if (running) return;
  while (dirs.length > 0) {
    running = true;
    const cwd = dirs.shift();
    console.log("pruning reflog", cwd);
    await spawnAsync("git", ["reflog", "expire", "--expire=all", "--all"], { cwd, stdio: "pipe", shell: true }).catch(
      (e) => console.log("failed prune reflog", e.message)
    );
    await delay(3);
    running = false;
  }
}
fetchDirs("**/.git");
