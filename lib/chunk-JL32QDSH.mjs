import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  init_esm_shims
} from "./chunk-VXZQNLPU.mjs";
import {
  __commonJS
} from "./chunk-FB6YIQYR.mjs";

// src/ps/isWin.js
var require_isWin = __commonJS({
  "src/ps/isWin.js"(exports, module) {
    init_esm_shims();
    var isWin = process.platform === "win32";
    module.exports = isWin;
  }
});

export {
  require_isWin
};
