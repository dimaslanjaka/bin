import fs from 'fs-extra';
import path from 'upath';
import { fileURLToPath } from 'url';
import { getArgs } from './utils/index.cjs';
import removeSubmodule from './submodule-remove.cjs';

const scriptName = path.toUnix(path.relative(process.cwd(), fileURLToPath(import.meta.url)));
const args = getArgs();
const submodulePath = args._[0];
if (!submodulePath) {
  console.error(`Usage: node ${scriptName} <submodule-path>`);
  process.exit(1);
}

if (!fs.existsSync(path.resolve(submodulePath))) {
  console.warn(`Error: The path "${submodulePath}" does not exist, continue deinitialization and cleanup steps.`);
  // process.exit(1);
}

(async () => {
  await removeSubmodule(submodulePath);
})();
