import path from 'upath';

const SKIP_DIRS = ['node_modules', 'lib', 'dist', 'binaries', 'coverage', 'tmp'];

/**
 * Default ignore patterns combining structural skips and project-level ignores.
 *
 * Each pattern can be:
 * - `RegExp` — tested against the src-relative path
 * - `string` ending with `/` — directory prefix check
 * - `string` in `/pattern/` form — converted to regex test
 * - `string` — exact relative path match
 */
export const DEFAULT_IGNORE_PATTERNS = [
  // Structural: skip files inside certain directories (any depth)
  ...SKIP_DIRS.map((d) => new RegExp(`(^|/)${d}/`)),

  // Structural: skip specific file patterns
  /-cli\.\w+$/,
  /\.runner\.\w+$/,
  /\.d\.ts$/,
  /__snapshots__/,
  /fixtures?/,
  /\.test\./,
  /\.spec\./,

  // Project-level: specific files to ignore
  'utils/extract-local-files.js',
  'utils/eslint-helper.cjs',
  'git/git-diff.js',
  'git/git-diff-staged-ai.mjs',
  /\.builder\./,
  'export-scanner/'
];

/**
 * Check if a file matches any ignore pattern.
 * @param {string} file - absolute path to the file
 * @param {string} srcDir - root src directory
 * @param {Array<RegExp|string>} patterns - list of ignore patterns
 * @returns {boolean}
 */
export function shouldIgnore(file, srcDir, patterns) {
  const relative = path.toUnix(path.relative(srcDir, file));
  return patterns.some((p) => {
    if (p instanceof RegExp) {
      return p.test(relative);
    }

    if (typeof p === 'string') {
      // /pattern/ string → regex test
      if (p.startsWith('/') && p.endsWith('/') && p.length > 2) {
        return new RegExp(p.slice(1, -1)).test(relative);
      }

      // trailing / → directory prefix
      if (p.endsWith('/')) {
        return relative.startsWith(p);
      }

      // exact match
      return relative === p;
    }

    return false;
  });
}
