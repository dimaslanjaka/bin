import {
  require_utils
} from "./chunk-IUQOFXK6.mjs";
import {
  init_esm_shims
} from "./chunk-S5U5CNLS.mjs";
import {
  __require
} from "./chunk-7I4CRWDS.mjs";

// src/del-node-modules.js
init_esm_shims();
var glob = __require("glob");
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
