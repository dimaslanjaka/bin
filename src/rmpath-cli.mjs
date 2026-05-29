import { deleteMainScript } from './rmpath.mjs';
import { getArgs } from './utils/index.cjs';

const argv = getArgs();
const positional = argv._ || [];

if (positional.length === 0) {
  console.error('You need to provide a file or folder path');
  process.exit(1);
} else {
  deleteMainScript(positional[0]);
}
