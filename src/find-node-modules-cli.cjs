#!/usr/bin/env node

const findNodeModules = require('./find-node-modules.cjs');

findNodeModules(null, console.log);

// Provide a "default" alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
