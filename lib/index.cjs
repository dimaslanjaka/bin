var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  findNodeModules: () => import_find_node_modules.default
});
module.exports = __toCommonJS(index_exports);
init_cjs_shims();
var import_find_node_modules = __toESM(require_find_node_modules());
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  findNodeModules
});
