const path = require('path');

import('./src/node-package-packer-cli.mjs').then(() => {
  import('./src/print-tarball-tree.mjs').then((lib) => {
    lib.mainPrintTgzTree(path.resolve(__dirname, 'releases/bin.tgz'));
  });
});
