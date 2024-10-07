import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  require_find_node_modules
} from "./chunk-RY4ZWD32.mjs";
import {
  init_esm_shims
} from "./chunk-FVVYUJVB.mjs";
import {
  __toESM
} from "./chunk-FB6YIQYR.mjs";

// src/index.ts
init_esm_shims();
var import_find_node_modules = __toESM(require_find_node_modules());
var export_findNodeModules = import_find_node_modules.default;
export {
  export_findNodeModules as findNodeModules
};
