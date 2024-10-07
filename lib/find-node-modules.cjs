// src/find-node-modules.js
var glob = require("glob");
var path = require("path");
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
