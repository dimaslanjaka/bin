var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/tsup/assets/cjs_shims.js
var init_cjs_shims = __esm({
  "node_modules/tsup/assets/cjs_shims.js"() {
  }
});

// src/utils.js
var require_utils = __commonJS({
  "src/utils.js"(exports2, module2) {
    init_cjs_shims();
    var { fs, path: path2 } = require("sbg-utility");
    var argv = require("minimist")(process.argv.slice(2));
    function getArgs() {
      return argv;
    }
    function del(fullPath) {
      if (fs.statSync(fullPath).isDirectory()) {
        const subdir = fs.readdirSync(fullPath).map((dirPath) => path2.resolve(fullPath, dirPath));
        for (let i = 0; i < subdir.length; i++) {
          del(subdir[i]);
        }
      } else {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true, retryDelay: 7e3 });
          console.log("deleted", fullPath);
        } catch (_) {
          console.log("failed delete", fullPath);
        }
      }
    }
    function delStream(globStream) {
      globStream.stream().on("data", (result) => {
        const fullPath = path2.resolve(process.cwd(), result);
        if (fs.statSync(fullPath).isDirectory()) {
          const subdir = fs.readdirSync(fullPath).map((dirPath) => path2.resolve(fullPath, dirPath));
          for (let i = 0; i < subdir.length; i++) {
            del(subdir[i]);
          }
        }
        del(fullPath);
      });
    }
    var delay2 = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    module2.exports = { del, delStream, getArgs, delay: delay2 };
  }
});

// src/git-purge.js
init_cjs_shims();
var { spawnAsync } = require("cross-spawn");
var glob = require("glob");
var path = require("path");
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
