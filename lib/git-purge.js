const { spawnAsync } = require('cross-spawn');
const glob = require('glob');
const path = require('path');
const { delay } = require('./utils');

const globStream = new glob.Glob(['**/.git'], {
  withFileTypes: false,
  cwd: process.cwd(),
  ignore: ['**/node_modules/**', '**/vendor/**']
});

/** @type {string[]} */
const dirs = [];

globStream.stream().on('data', (result) => {
  const fullPath = path.resolve(process.cwd(), result);
  const base = path.dirname(fullPath);
  dirs.push(base);
  start();
});

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
    delay(3);
    // stop
    running = false;
  }
}
