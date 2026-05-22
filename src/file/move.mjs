import fs from "fs-extra";
import path from "upath";

export async function move(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source file does not exist: ${src}`);
  }
  if (!path.resolve(src)) {
    throw new Error(`Source path is not resolved: ${src}`);
  }
  await fs.move(src, dest, { overwrite: true });
}
