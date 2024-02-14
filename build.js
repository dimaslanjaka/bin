const path = require('upath');
const fs = require('fs');
const glob = require('glob');
const pkgj = require('./package.json');

pkgj.bin = {
  nrs: 'lib/npm-run-series.js',
  'run-s': 'lib/npm-run-series.js',
  'run-series': 'lib/npm-run-series.js',
  'npm-run-series': 'lib/npm-run-series.js',
  'del-nodemodules': 'lib/del-node-modules.js',
  'del-yarncaches': 'lib/del-yarn-caches.js',
  'find-nodemodules': 'lib/find-node-modules.js',
  'del-ps': 'lib/del-ps.js',
  'del-gradle': 'lib/del-gradle.js',
  'git-purge': 'lib/git-purge.js'
};

glob
  .sync('**/*', {
    cwd: __dirname,
    ignore: [
      '**/node_modules/**',
      '**/boilerplate/**',
      '**/.git*',
      '**/yarn.lock',
      '**/{package,package-lock}.json',
      '**/releases/**',
      '**/tmp/**',
      '**/test/**',
      '**/LICENSE',
      '**/.yarn/**',
      '**/.yarn*',
      '**/dist/**',
      '**/.github/**',
      '**/*.{md,ts,js,txt,log,json,lock}',
      '**/bash-dummy*',
      '**/.yarn*',
      // ignore .txt files
      '**/*.txt'
    ]
  })
  .filter((str) => {
    const resolved = path.join(__dirname, str);
    if ([path.toUnix(__filename)].includes(resolved)) return false;
    return fs.statSync(resolved).isFile();
  })
  .forEach((str) => {
    let basename = path.basename(str).replace(/\./gm, '-');
    pkgj.bin[basename] = path.toUnix(str);
  });

// sort
pkgj.bin = sortObjectByKeys(pkgj.bin);

fs.writeFileSync(path.resolve(__dirname, 'package.json'), JSON.stringify(pkgj, null, 2) + '\n');
//cp.sync('yarn', ['install'], { cwd: __dirname });
// copy to test

/**
 * sort object by keys
 * @param {Record<string,any>} object
 * @param {{desc?:boolean}} param1
 * @returns
 */
function sortObjectByKeys(object, { desc = false } = {}) {
  return Object.fromEntries(Object.entries(object).sort(([k1], [k2]) => ((k1 < k2) ^ desc ? -1 : 1)));
}
