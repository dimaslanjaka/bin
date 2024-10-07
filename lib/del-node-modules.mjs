import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  require_utils
} from "./chunk-LPLPQBYP.mjs";
import {
  init_esm_shims
} from "./chunk-7MSZ52XC.mjs";
import {
  __require
} from "./chunk-AVDT32AY.mjs";

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
