const fs = require('node:fs');
const path = require('node:path');
const glob = require('glob');

const DEFAULT_IGNORES = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.yarn/**',
  '**/.pnpm/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/vendor/**',
  '**/tmp/**',
  '**/.cache/**',
  '**/assets/**',
  '**/logs/**',
  '**/output/**',
  '**/public/**',
  '**/static/**',
  '**/temp/**',
  '**/backup/**',
  '**/backups/**',
  '**/examples/**',
  '**/docs/**',
  '**/tests/**',
  '**/__tests__/**',
  '**/spec/**',
  '**/__specs__/**',
  '**/scripts/**',
  '**/bin/**',
  '**/hooks/**',
  '**/config/**',
  '**/configs/**',
  '**/settings/**',
  '**/.vscode/**',
  '**/.idea/**'
];

/**
 * Find all `.env*` files from the current directory tree
 * and parent directories.
 *
 * @param {string} [startDir=process.cwd()] Starting directory.
 * @param {(file: string) => boolean} [filter] Optional filter callback.
 * @returns {string[]} Normalized absolute file paths.
 */
function findEnvFiles(startDir = process.cwd(), filter) {
  /** @type {Set<string>} */
  const found = new Set();

  /**
   * Add a file if it passes validation.
   *
   * @param {string} file
   * @returns {void}
   */
  function addFile(file) {
    const normalized = path.normalize(file);

    if (typeof filter === 'function' && !filter(normalized)) {
      return;
    }

    found.add(normalized);
  }

  /* --------------------------------
   * Parent directories
   * -------------------------------- */
  let current = path.resolve(startDir);

  while (true) {
    const envPath = path.join(current, '.env');

    if (fs.existsSync(envPath)) {
      addFile(envPath);
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
  const files = glob.globSync('**/.env*', {
    cwd: startDir,
    absolute: true,
    nodir: true,
    ignore: DEFAULT_IGNORES
  });

  for (const file of files) {
    addFile(file);
  }

  return [...found];
}

/**
 * Find the first `.env*` file containing a token variable.
 *
 * @param {string} [startDir=process.cwd()] Starting directory.
 * @param {string} [tokenName="GITHUB_TOKEN"] Environment variable name.
 * @returns {string | undefined} Matching file path.
 */
function findEnvWithToken(startDir = process.cwd(), tokenName = 'GITHUB_TOKEN') {
  const envFiles = findEnvFiles(startDir);

  return envFiles.find((file) => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const regex = new RegExp(`^\\s*${tokenName}\\s*=`, 'm');

      return regex.test(content);
    } catch (err) {
      console.warn(`Failed to read ${file}: ${err instanceof Error ? err.message : String(err)}`);

      return false;
    }
  });
}

module.exports = {
  DEFAULT_IGNORES,
  findEnvFiles,
  findEnvWithToken,
  default: findEnvFiles
};
