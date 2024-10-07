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

// src/del-yarn-caches.js
init_esm_shims();
var glob = __require("glob");
var { delStream } = require_utils();
var g3 = new glob.Glob(["**/.yarn/cache*", "**/.yarn/*.gz"], {
  withFileTypes: false,
  cwd: process.cwd(),
  ignore: ["**/.git*", "**/vendor/**"]
});
delStream(g3);
