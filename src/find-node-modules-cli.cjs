#!/usr/bin/env node

const findNodeModules = require('./find-node-modules.cjs');

findNodeModules(null, console.log)
  .then((dirs) => {
    console.log(`Found ${dirs.length} node_modules directories.`);
  })
  .catch((err) => {
    console.error('Error finding node_modules directories:', err);
  });
