import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  require_utils
} from "./chunk-WM776AYP.mjs";
import {
  init_esm_shims
} from "./chunk-QGR3CI7A.mjs";
import {
  __require
} from "./chunk-FB6YIQYR.mjs";

// src/del-gradle.js
init_esm_shims();
var glob = __require("glob");
var { path } = __require("sbg-utility");
var { del } = require_utils();
var globStream = new glob.Glob(["**/build.gradle"], {
  withFileTypes: false,
  cwd: process.cwd(),
  ignore: ["**/node_modules/**", "**/vendor/**"]
});
globStream.stream().on("data", (result) => {
  const fullPath = path.resolve(process.cwd(), result);
  const base = path.dirname(fullPath);
  const buildFolder = path.join(base, "build");
  console.log("delete build folder", buildFolder);
  del(buildFolder);
});
