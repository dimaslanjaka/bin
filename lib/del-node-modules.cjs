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
    var { fs, path } = require("sbg-utility");
    var argv = require("minimist")(process.argv.slice(2));
    function getArgs() {
      return argv;
    }
    function del(fullPath) {
      if (fs.statSync(fullPath).isDirectory()) {
        const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
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
    function delStream2(globStream) {
      globStream.stream().on("data", (result) => {
        const fullPath = path.resolve(process.cwd(), result);
        if (fs.statSync(fullPath).isDirectory()) {
          const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
          for (let i = 0; i < subdir.length; i++) {
            del(subdir[i]);
          }
        }
        del(fullPath);
      });
    }
    var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    module2.exports = { del, delStream: delStream2, getArgs, delay };
  }
});

// src/del-node-modules.js
init_cjs_shims();
var glob = require("glob");
var { delStream } = require_utils();
var globalIgnore = [
  // ignore .git .github folder
  "**/.git*",
  // ignore composer folder
  "**/vendor/**"
];
console.log("cleaning node_modules in", process.cwd());
var g3 = new glob.Glob("**/node_modules", {
  withFileTypes: false,
  cwd: process.cwd(),
  ignore: globalIgnore
});
delStream(g3);
