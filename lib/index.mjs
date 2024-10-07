import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  require_find_node_modules
} from "./chunk-BE6BIBDQ.mjs";
import {
  init_esm_shims
} from "./chunk-QGR3CI7A.mjs";
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
