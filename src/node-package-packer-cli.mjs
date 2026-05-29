/**
 * packer.js - Automated tarball (tgz) creator for release folder
 *
 * Requirements: npm i -D https://github.com/dimaslanjaka/node-cross-spawn/tarball/private upath fs-extra
 * Source (raw): https://github.com/dimaslanjaka/nodejs-package-types/raw/main/packer.js
 * GitHub:      https://github.com/dimaslanjaka/nodejs-package-types/blob/main/packer.js
 * Update:      curl -L https://github.com/dimaslanjaka/nodejs-package-types/raw/main/packer.js > packer.js
 * Usage:       node packer.js
 */

import path from 'upath';
import { getArgs } from './utils/index.cjs';

const args = getArgs({ boolean: ['h', 'help'] });

if (args.h || args.help) {
  const scriptName = path.basename(new URL(import.meta.url).pathname);
  console.log(`Automated tarball (tgz) creator for release folder`);
  console.log(``);
  console.log(`Usage: node ${scriptName} [options]`);
  console.log(``);
  console.log(`Options:`);
  console.log(`  -h, --help           Show this help message`);
  console.log(`  -y, --yarn           Force yarn pack instead of npm pack`);
  console.log(`  -d, --verbose        Enable verbose output`);
  console.log(`  --fn, --filename     Set output filename variant`);
  process.exit(0);
}

(async () => {
  const { bundle } = await import('./node-package-packer/build-tarball.mjs');
  await bundle();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
