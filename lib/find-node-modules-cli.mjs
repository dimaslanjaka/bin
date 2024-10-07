#!/usr/bin/env node
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  require_find_node_modules
} from "./chunk-RY4ZWD32.mjs";
import {
  init_esm_shims
} from "./chunk-FVVYUJVB.mjs";
import "./chunk-FB6YIQYR.mjs";

// src/find-node-modules-cli.js
init_esm_shims();
var findNodeModules = require_find_node_modules();
findNodeModules(null, console.log);
