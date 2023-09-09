const path = require('upath');
const fs = require('fs');
const glob = require('glob');
const pkgj = require('./package.json');
const cp = require('cross-spawn');

pkgj.bin = {
  nrs: 'lib/npm-run-series.js',
  'run-s': 'lib/npm-run-series.js',
  'run-series': 'lib/npm-run-series.js',
  'npm-run-series': 'lib/npm-run-series.js',
};

glob
  .sync('**/*', {
    cwd: __dirname,
    ignore: [
      '**/node_modules/**',
      '**/boilerplate/**',
      '**/.git*',
      '**/yarn.lock',
      '**/package.json',
      '**/releases/**',
      '**/tmp/**',
      '**/test/**',
      '**/LICENSE',
      '**/.yarn/**',
      '**/.yarn*',
      '**/.github/**',
      '**/*.{md,ts,js,txt,log,json,lock}',
      '**/bash-dummy*',
    ],
  })
  //.map((str) => path.resolve(__dirname, str))
  .filter(str => {
    const resolved = path.resolve(__dirname, str);
    if ([__filename].includes(resolved)) return false;
    return fs.statSync(str).isFile();
  })
  .forEach(str => {
    pkgj.bin[path.basename(str)] = path.toUnix(str);
  });

fs.writeFileSync(path.resolve(__dirname, 'package.json'), JSON.stringify(pkgj, null, 2) + '\n');
cp.sync('yarn', ['install'], { cwd: __dirname });
// copy to test
