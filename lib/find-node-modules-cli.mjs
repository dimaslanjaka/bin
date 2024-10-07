#!/usr/bin/env node
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  require_find_node_modules
} from "./chunk-BE6BIBDQ.mjs";
import {
  init_esm_shims
} from "./chunk-QGR3CI7A.mjs";
import "./chunk-FB6YIQYR.mjs";

// src/find-node-modules-cli.js
init_esm_shims();
var findNodeModules = require_find_node_modules();
findNodeModules(null, console.log);
