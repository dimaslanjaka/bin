import fs from 'fs-extra';
import minimist from 'minimist';
import path from 'upath';
import removeSubmodule from './submodule-remove.cjs';

const args = minimist(process.argv.slice(2));
const submodulePath = args._[0];
if (!submodulePath) {
  console.error('Usage: node submodule-remove.cjs <submodule-path>');
  process.exit(1);
}

if (!fs.existsSync(path.resolve(submodulePath))) {
  console.warn(`Error: The path "${submodulePath}" does not exist, continue deinitialization and cleanup steps.`);
  // process.exit(1);
}

(async () => {
  await removeSubmodule(submodulePath);
})();
