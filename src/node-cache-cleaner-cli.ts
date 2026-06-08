#!/usr/bin/env node

import { getArgs } from './utils/index.cjs';
import { cleanNpmCache } from './cache-cleaner/npm';
import { cleanNpxCache } from './cache-cleaner/npx';
import { cleanYarnCache, cleanProjectYarnCaches } from './cache-cleaner/yarn';

function printHelp() {
  console.log(`
Usage: cache-cleaner [options]

Options:
  -h, --help     Show this help message
  -g, --global   Also clean NPM, Yarn, and NPX global caches

Description:
  By default, removes project-level Yarn Berry offline cache files
  (.yarn/cache*, .yarn/*.gz). Pass --global to additionally clean global
  NPM, Yarn, and NPX caches.
`);
}

async function run() {
  const argv = getArgs({
    boolean: ['help', 'global'],
    alias: {
      h: 'help',
      g: 'global'
    },
    default: {
      help: false,
      global: false
    }
  });

  if (argv.help) {
    printHelp();
    process.exit(0);
  }

  const cleaners: Promise<unknown>[] = [cleanProjectYarnCaches()];
  const labels: string[] = ['Yarn (project cache)'];

  if (argv.global) {
    cleaners.push(cleanNpmCache(), cleanYarnCache(), cleanNpxCache());
    labels.push('NPM', 'Yarn (global)', 'NPX');
  }

  const results = await Promise.allSettled(cleaners);

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
