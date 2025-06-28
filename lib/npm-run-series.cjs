#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/npm-run-series.js
var fs = require("fs");
var path = require("path");
var { Minimatch } = require("minimatch");
var args = require("minimist")(process.argv.slice(2));
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
