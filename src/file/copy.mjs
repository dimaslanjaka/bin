import fs from "fs-extra";
import path from "upath";

export async function copy(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source file does not exist: ${src}`);
  }
  if (!path.resolve(src)) {
    throw new Error(`Source path is not resolved: ${src}`);
  }
  await fs.ensureDir(path.dirname(dest));
  await fs.copy(src, dest, { overwrite: true });
}
