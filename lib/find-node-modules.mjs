import {
  init_esm_shims
} from "./chunk-S5U5CNLS.mjs";
import {
  __require
} from "./chunk-7I4CRWDS.mjs";

// src/find-node-modules.js
init_esm_shims();
var glob = __require("glob");
var path = __require("path");
var g3 = new glob.Glob("**/node_modules", {
  withFileTypes: false,
  cwd: process.cwd(),
  ignore: ["**/.git*", "**/vendor/**"]
});
g3.stream().on("data", (result) => {
  const fullPath = path.resolve(process.cwd(), result);
  console.log(fullPath);
});
