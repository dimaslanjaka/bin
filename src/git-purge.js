const { spawnAsync } = require('cross-spawn');
const glob = require('glob');
const path = require('path');
const { delay } = require('./utils');

/** @type {string[]} */
const dirs = [];
/**
 * fetch directories
 * @param {string|string[]} pattern
 * @param {(filePath: string) => any} callback
 */
const fetchDirs = (pattern, callback) => {
  const globStream = new glob.Glob(pattern, {
    withFileTypes: false,
    cwd: process.cwd(),
    ignore: ['**/node_modules/**', '**/vendor/**']
  });

  globStream.stream().on('data', (result) => {
    const fullPath = path.resolve(process.cwd(), result);
    if (typeof callback == 'function') callback(fullPath);
    const base = path.dirname(fullPath);
    // push directory when not exist
    if (!dirs.includes(base)) dirs.push(base);
    start();
  });
};

let running = false;
async function start() {
  // skip run when still running
  if (running) return;
  while (dirs.length > 0) {
    // start
    running = true;

    const cwd = dirs.shift();
    console.log('pruning reflog', cwd);
    await spawnAsync('git', ['reflog', 'expire', '--expire=all', '--all'], { cwd, stdio: 'pipe', shell: true }).catch(
      (e) => console.log('failed prune reflog', e.message)
    );
    // git gc --prune=now --aggressive

    // delay 3s
    await delay(3);
    // stop
    running = false;
  }
}

// script starts here

fetchDirs('**/.git');
