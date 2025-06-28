#!/usr/bin/env node
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  init_esm_shims
} from "./chunk-VXZQNLPU.mjs";
import {
  __require
} from "./chunk-FB6YIQYR.mjs";

// src/npm-run-series.js
init_esm_shims();
var fs = __require("fs");
var path = __require("path");
var { Minimatch } = __require("minimatch");
var args = __require("minimist")(process.argv.slice(2));
var cwd = process.cwd();
var packagejson = path.join(cwd, "package.json");
var verbose = args["v"] || args["verbose"];
var usingYarn = args["yarn"];
(async function npmRunSeries() {
  const { execa } = await import("execa");
  if (fs.existsSync(packagejson)) {
    const parse = JSON.parse(fs.readFileSync(packagejson, "utf-8"));
    if (parse !== null && typeof parse === "object") {
      if ("scripts" in parse) {
        const patterns = args._;
        const scripts = parse.scripts;
        const scriptNames = Object.keys(scripts);
        for (let i = 0; i < patterns.length; i++) {
          const pattern = patterns[i];
          const matcher = new Minimatch(pattern, { nonegate: true });
          for (let ii = 0; ii < scriptNames.length; ii++) {
            const scriptName = scriptNames[ii];
            const match = matcher.match(scriptName);
            if (verbose) console.log({ pattern, scriptName, match });
            if (match === true) {
              await execa(usingYarn ? "yarn" : "npm", ["run", scriptName], {
                cwd,
                stdio: "inherit"
              });
            }
          }
        }
      }
    }
  }
})();
