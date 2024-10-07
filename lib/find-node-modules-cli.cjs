#!/usr/bin/env node
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

// src/find-node-modules.js
var require_find_node_modules = __commonJS({
  "src/find-node-modules.js"(exports2, module2) {
    init_cjs_shims();
    var glob = require("glob");
    var path = require("path");
    function findNodeModules2(dir = process.cwd(), callback = null) {
      const finalDir = typeof dir === "string" ? dir : process.cwd();
      return new Promise((resolve, reject) => {
        const results = [];
        const g3 = new glob.Glob("**/node_modules", {
          withFileTypes: false,
          cwd: finalDir,
          ignore: ["**/.git*", "**/vendor/**"]
        });
        const stream = g3.stream();
        stream.on("data", (result) => {
          const fullPath = path.resolve(finalDir, result);
          if (typeof callback === "function") {
            try {
              callback(fullPath);
            } catch (err) {
              console.error("findNodeModules callback error:", err);
            }
          }
          results.push(fullPath);
        });
        stream.on("error", (err) => reject(err));
        stream.on("end", () => {
          if (results.length === 0) {
            console.log("No node_modules directories found.");
          }
          resolve(results);
        });
      });
    }
    module2.exports = findNodeModules2;
  }
});

// src/find-node-modules-cli.js
init_cjs_shims();
var findNodeModules = require_find_node_modules();
findNodeModules(null, console.log);
