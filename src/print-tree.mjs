import fs from 'fs-extra';
import path from 'upath';
import { mainPrintDirectoryTree } from './print-directory-tree.cjs';
import { mainPrintTgzTree } from './print-tarball-tree.mjs';
import { isBinaryFile } from './run-by-checksum/hash.cjs';

export async function printTree(...paths) {
  const target = path.join(...paths);
  if (!fs.existsSync(target)) {
    console.log('File not found');
    return;
  }
  if (fs.statSync(target).isDirectory()) {
    await mainPrintDirectoryTree({ cwd: target });
  } else if (isBinaryFile(target)) {
    await mainPrintTgzTree(target);
  }
}
