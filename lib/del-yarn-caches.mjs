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
