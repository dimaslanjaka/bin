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

// src/ps/isWin.js
var require_isWin = __commonJS({
  "src/ps/isWin.js"(exports2, module2) {
    init_cjs_shims();
    var isWin2 = process.platform === "win32";
    module2.exports = isWin2;
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
    function delStream(globStream) {
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
    module2.exports = { del, delStream, getArgs, delay };
  }
});

// src/del-ps.js
init_cjs_shims();
var crossSpawn = require("cross-spawn");
var ps = require("ps-node");
var isWin = require_isWin();
var utils = require_utils();
utils.getArgs()._.forEach((command) => {
  ps.lookup(
    {
      command,
      psargs: "ux"
    },
    function(err, resultList) {
      if (err) {
        throw new Error(err);
      }
      resultList.forEach(function(process2) {
        if (process2) {
          if (!isWin) {
            crossSpawn.spawnAsync("kill", ["-9", process2.pid]).catch((e) => console.log(`kill failed ${e.message}`));
            crossSpawn.spawnAsync("killall", ["-9", process2.pid]).catch((e) => console.log(`killall failed ${e.message}`));
          } else {
            crossSpawn.spawnAsync("wmic", ["process", "where", `"name like '${command}'" delete`]).catch((e) => console.log(`wmic failed ${e.message}`));
          }
        }
      });
    }
  );
});
