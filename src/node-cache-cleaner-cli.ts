#!/usr/bin/env node

import minimist from 'minimist';
import { cleanNpmCache } from './node-cache-cleaner/npm';
import { cleanNpxCache } from './node-cache-cleaner/npx';
import { cleanYarnCache } from './node-cache-cleaner/yarn';

function printHelp() {
  console.log(`
Usage: cache-cleaner [options]

Options:
  -h, --help     Show this help message

Description:
  Cleans NPM, Yarn, and NPX caches in parallel.
`);
}

async function run() {
  const argv = minimist(process.argv.slice(2), {
    boolean: ['help'],
    alias: {
      h: 'help'
    },
    default: {
      help: false
    }
  });

  if (argv.help) {
    printHelp();
    process.exit(0);
  }

  const results = await Promise.allSettled([cleanNpmCache(), cleanYarnCache(), cleanNpxCache()]);

  const labels = ['NPM', 'Yarn', 'NPX'];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.log(`${labels[i]} cache cleaned successfully.`);
    } else {
      console.error(`Error cleaning ${labels[i]} cache:`, result.reason);
    }
  });

  const hasError = results.some((r) => r.status === 'rejected');
  process.exit(hasError ? 1 : 0);
}

run();
