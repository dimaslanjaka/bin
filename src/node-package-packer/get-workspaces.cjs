const fs = require('fs-extra');
const path = require('upath');
const glob = require('glob');
const CryptoJS = require('crypto-js');

/** @type {Map<string, import('./get-workspaces-types').WorkspacesInfo>} */
const workspacesCache = new Map();

/**
 * @param {string} [rootDir] - Project root directory. Defaults to `process.cwd()`.
 * @returns {string}
 */
function getCacheFilePath(rootDir) {
  const dir = rootDir || process.cwd();
  return path.resolve(path.join(dir, 'tmp', 'binary-collections', 'get-workspaces.json'));
}

/**
 * @param {string} [rootDir] - Project root directory. Defaults to `process.cwd()`.
 * @returns {Promise<Record<string, import('./get-workspaces-types').WorkspacesInfo>>}
 */
async function readDiskCache(rootDir) {
  try {
    const content = await fs.readFile(getCacheFilePath(rootDir), 'utf8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * @param {string} [rootDir] - Project root directory. Defaults to `process.cwd()`.
 * @param {Record<string, import('./get-workspaces-types').WorkspacesInfo>} data
 */
async function writeDiskCache(rootDir, data) {
  const filePath = getCacheFilePath(rootDir);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Compute a cache key from the relevant configuration files.
 * The content of each file is hashed and combined into a single SHA-256 hex digest.
 *
 * Checksummed files:
 * - Root `package.json` (always)
 * - `.gitmodules` (if exists)
 * - Lock file: `yarn.lock`, `package-lock.json`, or `pnpm-lock.yaml` (first found)
 *
 * @param {string} rootDir
 * @returns {Promise<string>}
 */
async function computeCacheKey(rootDir) {
  const hash = CryptoJS.algo.SHA256.create();

  // Root package.json
  const pkgPath = path.join(rootDir, 'package.json');
  const pkgContent = await fs.readFile(pkgPath, 'utf8');
  hash.update(pkgContent);

  // .gitmodules (if exists)
  const gitmodulesPath = path.join(rootDir, '.gitmodules');
  if (await fs.pathExists(gitmodulesPath)) {
    const gitmodulesContent = await fs.readFile(gitmodulesPath, 'utf8');
    hash.update(gitmodulesContent);
  }

  // Lock file — only the first found lock file matters
  const lockFiles = ['yarn.lock', 'package-lock.json', 'pnpm-lock.yaml'];
  for (const lockFile of lockFiles) {
    const lockPath = path.join(rootDir, lockFile);
    if (await fs.pathExists(lockPath)) {
      const lockContent = await fs.readFile(lockPath, 'utf8');
      hash.update(lockContent);
      break;
    }
  }

  return hash.finalize().toString(CryptoJS.enc.Hex);
}

/**
 * Read JSON file.
 *
 * @param {string} filePath
 * @returns {Promise<any>}
 */
async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Normalize npm/yarn workspaces format.
 *
 * Supports:
 * - `"workspaces": ["packages/*"]`
 * - `"workspaces": { "packages": ["packages/*"] }`
 *
 * @param {import('./get-workspaces-types').WorkspacesConfig | undefined} workspaces
 * @returns {string[]}
 */
function normalizeWorkspaces(workspaces) {
  if (Array.isArray(workspaces)) {
    return workspaces;
  }

  if (workspaces && Array.isArray(workspaces.packages)) {
    return workspaces.packages;
  }

  return [];
}

/**
 * Detect package manager from lock files.
 *
 * @param {string} rootDir
 * @returns {Promise<"npm" | "yarn" | "pnpm" | "unknown">}
 */
async function detectPackageManager(rootDir) {
  if (await fs.pathExists(path.join(rootDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fs.pathExists(path.join(rootDir, 'yarn.lock'))) return 'yarn';
  if (await fs.pathExists(path.join(rootDir, 'package-lock.json'))) return 'npm';

  return 'unknown';
}

/**
 * Resolve workspace package.json files using glob.
 *
 * @param {string} rootDir
 * @param {string[]} workspacePatterns
 * @returns {Promise<string[]>}
 */
async function resolveWorkspacePackageJsonFiles(rootDir, workspacePatterns) {
  const includePatterns = [];
  const ignorePatterns = ['**/node_modules/**'];

  for (const pattern of workspacePatterns) {
    if (typeof pattern !== 'string') continue;

    if (pattern.startsWith('!')) {
      const cleaned = pattern.slice(1).replace(/\/$/, '');
      ignorePatterns.push(`${cleaned}/package.json`);
      ignorePatterns.push(`${cleaned}/**`);
      continue;
    }

    includePatterns.push(`${pattern.replace(/\/$/, '')}/package.json`);
  }

  if (!includePatterns.length) {
    return [];
  }

  const files = await glob.glob(includePatterns, {
    cwd: rootDir,
    absolute: true,
    nodir: true,
    ignore: ignorePatterns
  });

  return [...new Set(files)].sort();
}

/**
 * Internal: compute workspace info without caching.
 *
 * @param {string} resolvedRoot
 * @param {import('./get-workspaces-types').GetWorkspacesInfoOptions} options
 * @returns {Promise<import('./get-workspaces-types').WorkspacesInfo>}
 */
async function computeWorkspacesInfo(resolvedRoot, options) {
  const {
    absolutePaths = true,
    includeScripts = true,
    includeDependencies = true,
    includeRootPackage = false
  } = options;

  const rootPackageJsonPath = path.join(resolvedRoot, 'package.json');

  if (!(await fs.pathExists(rootPackageJsonPath))) {
    throw new Error(`package.json not found in: ${resolvedRoot}`);
  }

  const rootPackageJson = await readJson(rootPackageJsonPath);
  const workspacePatterns = normalizeWorkspaces(rootPackageJson.workspaces);
  const packageManager = await detectPackageManager(resolvedRoot);

  const packageJsonFiles = await resolveWorkspacePackageJsonFiles(resolvedRoot, workspacePatterns);

  if (includeRootPackage) {
    packageJsonFiles.unshift(rootPackageJsonPath);
  }

  const workspaces = [];

  for (const packageJsonPath of packageJsonFiles) {
    const pkg = await readJson(packageJsonPath);
    const workspaceDir = path.dirname(packageJsonPath);

    const relativePath = path.relative(resolvedRoot, workspaceDir).replaceAll('\\', '/');

    const workspace = {
      name: pkg.name || null,
      version: pkg.version || null,
      private: Boolean(pkg.private),
      path: relativePath || '.',
      packageJsonPath: absolutePaths
        ? packageJsonPath
        : path.relative(resolvedRoot, packageJsonPath).replaceAll('\\', '/')
    };

    if (absolutePaths) {
      workspace.absolutePath = workspaceDir;
    }

    if (includeScripts) {
      workspace.scripts = pkg.scripts || {};
    }

    if (includeDependencies) {
      workspace.dependencies = pkg.dependencies || {};
      workspace.devDependencies = pkg.devDependencies || {};
      workspace.peerDependencies = pkg.peerDependencies || {};
      workspace.optionalDependencies = pkg.optionalDependencies || {};
    }

    workspaces.push(workspace);
  }

  workspaces.sort((a, b) => a.path.localeCompare(b.path));

  return {
    root: resolvedRoot,
    packageManager,
    workspacePatterns,
    total: workspaces.length,
    workspaces
  };
}

/**
 * Get all npm/yarn workspace package information (with caching).
 *
 * When `useCache` is enabled (default), the result is cached keyed by a checksum
 * of root `package.json`, `.gitmodules`, and the project lock file.
 *
 * @param {string} [rootDir]
 * @param {import('./get-workspaces-types').GetWorkspacesInfoOptions} [options]
 * @returns {Promise<import('./get-workspaces-types').WorkspacesInfo>}
 */
async function getWorkspacesInfo(rootDir = process.cwd(), options = {}) {
  const { useCache = true } = options;
  const resolvedRoot = path.resolve(rootDir);

  if (useCache) {
    const cacheKey = await computeCacheKey(resolvedRoot);

    // L1: in-memory cache
    if (workspacesCache.has(cacheKey)) {
      return workspacesCache.get(cacheKey);
    }

    // L2: disk cache
    const diskCache = await readDiskCache(resolvedRoot);
    if (diskCache[cacheKey]) {
      workspacesCache.set(cacheKey, diskCache[cacheKey]);
      return diskCache[cacheKey];
    }

    // Miss: compute, store in both caches
    const result = await computeWorkspacesInfo(resolvedRoot, options);
    workspacesCache.set(cacheKey, result);
    diskCache[cacheKey] = result;
    await writeDiskCache(resolvedRoot, diskCache);
    return result;
  }

  return computeWorkspacesInfo(resolvedRoot, options);
}

/**
 * Clear the workspaces cache (in-memory and disk).
 * @param {string} [rootDir] - Project root directory. Defaults to `process.cwd()`.
 */
async function clearWorkspacesCache(rootDir) {
  workspacesCache.clear();
  try {
    await fs.unlink(getCacheFilePath(rootDir));
  } catch {
    // ignore if file doesn't exist
  }
}

module.exports = {
  getWorkspacesInfo,
  computeCacheKey,
  clearWorkspacesCache,
  normalizeWorkspaces,
  detectPackageManager,
  resolveWorkspacePackageJsonFiles
};
// Provide a `default` alias for consumers that import the compiled ESM default
module.exports.default = module.exports;
