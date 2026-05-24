import fs from 'fs-extra';
import path from 'upath';

export async function move(src, dest) {
  if (!(await fs.pathExists(src))) {
    throw new Error(`Source file does not exist: ${src}`);
  }

  const srcStat = await fs.stat(src);

  let finalDest = dest;

  // If src is a file and dest is a directory → append filename
  if (srcStat.isFile()) {
    const destStat = (await fs.pathExists(dest)) ? await fs.stat(dest) : null;

    if (destStat && destStat.isDirectory()) {
      finalDest = path.join(dest, path.basename(src));
    }
  }

  await fs.ensureDir(path.dirname(finalDest));
  await fs.move(src, finalDest, { overwrite: true });
}
