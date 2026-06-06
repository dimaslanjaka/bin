const path = require('path');
const { execFileSync } = require('child_process');
const { globSync } = require('glob');

const cwd = process.cwd();
const dirs = [
  { name: 'lib/', rel: 'lib', exts: ['.cjs', '.mjs', '.js'] },
  { name: 'binaries/', rel: 'binaries', exts: ['.cjs'] }
];

let failed = 0;
let passed = 0;
const emptyDirs = [];

function checkDir(label, dirPath, exts) {
  for (const ext of exts) {
    const files = globSync(`**/*${ext}`, { cwd: dirPath, nodir: true, ignore: ['*chunk*'] }).sort();
    if (files.length === 0) {
      emptyDirs.push(`${label} (no ${ext} files)`);
      continue;
    }
    console.log(`--- ${ext.slice(1).toUpperCase()} modules (${label}) ---`);
    console.log(`Found ${files.length} ${ext} files`);

    for (const f of files) {
      const absPath = path.resolve(dirPath, f);
      try {
        // Syntax check only — no module execution
        execFileSync(process.execPath, ['-c', absPath], {
          timeout: 10000,
          stdio: 'pipe'
        });
        const rel = path.relative(cwd, absPath).replace(/\\/g, '/');
        console.log(`  ✅ ${rel}`);
        passed++;
      } catch (e) {
        const stderr = e.stderr ? e.stderr.toString().trim() : '';
        console.error(`  ❌ ${f}: ${stderr.split('\n').pop() || e.message}`);
        failed++;
      }
    }
  }
}

for (const d of dirs) {
  checkDir(d.name, path.resolve(cwd, d.rel), d.exts);
}

if (emptyDirs.length > 0) {
  throw new Error(`Missing compiled output in:\n  ${emptyDirs.join('\n  ')}`);
}

const total = passed + failed;
console.log(`\nPassed: ${passed}/${total}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
console.log('✅ All compiled files pass syntax check');
