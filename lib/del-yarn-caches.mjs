import {
  require_utils
} from "./chunk-IUQOFXK6.mjs";
import {
  init_esm_shims
} from "./chunk-S5U5CNLS.mjs";
import {
  __require
} from "./chunk-7I4CRWDS.mjs";

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
