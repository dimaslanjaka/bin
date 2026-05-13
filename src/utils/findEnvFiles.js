import fs from "node:fs";
import path from "node:path";
import * as glob from "glob";

const DEFAULT_IGNORES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.yarn/**",
  "**/.pnpm/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/vendor/**",
  "**/tmp/**",
  "**/.cache/**",
  "**/assets/**",
  "**/logs/**",
  "**/output/**",
  "**/public/**",
  "**/static/**",
  "**/temp/**",
  "**/backup/**",
  "**/backups/**",
  "**/examples/**",
  "**/docs/**",
  "**/tests/**",
  "**/__tests__/**",
  "**/spec/**",
  "**/__specs__/**",
  "**/scripts/**",
  "**/bin/**",
  "**/hooks/**",
  "**/config/**",
  "**/configs/**",
  "**/settings/**",
  "**/.vscode/**",
  "**/.idea/**"
];

/**
 * Find .env files in:
 * - current directory
 * - parent directories
 * - subdirectories
 *
 * @param {string} startDir
 * @returns {string[]}
 */
export function findEnvFiles(startDir = process.cwd()) {
  const found = new Set();

  /* --------------------------------
   * Parent directories
   * -------------------------------- */
  let current = path.resolve(startDir);

  while (true) {
    const envPath = path.join(current, ".env");

    if (fs.existsSync(envPath)) {
      found.add(path.normalize(envPath));
    }

    const parent = path.dirname(current);

    if (parent === current) {
      break;
    }

    current = parent;
  }

  /* --------------------------------
   * Subdirectories via glob
   * -------------------------------- */
  const files = glob.globSync("**/.env", {
    cwd: startDir,
    absolute: true,
    nodir: true,
    ignore: DEFAULT_IGNORES
  });

  for (const file of files) {
    found.add(path.normalize(file));
  }

  return [...found];
}
