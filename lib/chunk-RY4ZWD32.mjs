import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  init_esm_shims
} from "./chunk-FVVYUJVB.mjs";
import {
  __commonJS,
  __require
} from "./chunk-FB6YIQYR.mjs";

// src/find-node-modules.js
var require_find_node_modules = __commonJS({
  "src/find-node-modules.js"(exports, module) {
    init_esm_shims();
    var glob = __require("glob");
    var path = __require("path");
    function findNodeModules(dir = process.cwd(), callback = null) {
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
    module.exports = findNodeModules;
  }
});

export {
  require_find_node_modules
};
