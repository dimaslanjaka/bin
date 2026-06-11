import fs from 'fs-extra';
import path from 'upath';

/**
 * Resolve a source path that may use .js extension for .ts files
 * (tsup/bundler convention). Returns first existing path or null.
 * @param {string} rawSrc - path relative to srcDir
 * @param {string} srcDir - root src directory
 * @returns {string | null}
 */
export function resolveSourcePath(rawSrc, srcDir) {
  const absolute = path.join(srcDir, rawSrc);
  if (fs.existsSync(absolute)) return absolute;

  // Try swapping .js → .ts (bundler convention)
  if (rawSrc.endsWith('.js')) {
    const tsPath = absolute.replace(/\.js$/, '.ts');
    if (fs.existsSync(tsPath)) return tsPath;
  }

  // Try adding .ts extension
  if (!path.extname(rawSrc)) {
    const withTs = absolute + '.ts';
    if (fs.existsSync(withTs)) return withTs;
  }

  return null;
}
