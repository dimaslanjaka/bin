/**
 * packer.js - Automated tarball (tgz) creator for release folder
 *
 * Requirements: npm i -D https://github.com/dimaslanjaka/node-cross-spawn/tarball/private upath fs-extra
 * Source (raw): https://github.com/dimaslanjaka/nodejs-package-types/raw/main/packer.js
 * GitHub:      https://github.com/dimaslanjaka/nodejs-package-types/blob/main/packer.js
 * Update:      curl -L https://github.com/dimaslanjaka/nodejs-package-types/raw/main/packer.js > packer.js
 * Usage:       node packer.js
 * CI Example:  https://github.com/dimaslanjaka/nodejs-package-types/blob/main/.github/workflows/build-release.yml
 *
 * For ESM projects, download as package.cjs:
 *   curl -L https://github.com/dimaslanjaka/nodejs-package-types/raw/main/packer.js -o package.cjs
 *   Invoke-WebRequest -Uri "https://github.com/dimaslanjaka/nodejs-package-types/raw/main/packer.js" -OutFile "package.cjs"
 */

import('./src/node-package-packer-cli.mjs');
