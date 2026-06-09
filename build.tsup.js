import path from 'upath';
import { build } from 'tsup';
import pkgJson from './package.json' with { type: 'json' };

// Packages that should be bundled
const bundledPackages = [
  'p-limit',
  'deepmerge-ts',
  'hexo-is',
  'is-stream',
  'markdown-it',
  'node-cache',
  'is-file-stream',
  'strip-ansi',
  'ansi-regex'
  // 'sbg-utility',
  // 'through2'
  // 'git-command-helper',
  // 'cross-spawn'
];

/**
 * Native uniq replacement for lodash.uniq
 */
function uniq(arr) {
  return Array.from(new Set(arr));
}

const externalDeps = uniq(
  Object.keys(pkgJson.dependencies ?? {})
    .concat(Object.keys(pkgJson.devDependencies ?? {}))
    .concat([
      'hexo',
      'warehouse',
      'hexo-util',
      'canvas',
      'jsdom',
      'mime-db',
      'sbg-utility',
      'through2',
      'gulp',
      'bluebird'
    ])
).filter((pkgName, idx, arr) => !bundledPackages.includes(pkgName) && arr.indexOf(pkgName) === idx);

// Remove any possible tsup shims from the external array
const external = externalDeps.filter((dep) => !path.toUnix(dep).includes('/tsup/assets/'));

/**
 * @type {import("tsup").Options}
 */
const baseOption = {
  outDir: 'lib',
  entry: ['./src/**/*.ts', './src/**/*.js', './src/**/*.cjs', './src/**/*.mjs'],
  // Targets node18 → node24 (esbuild downlevels to the lowest target for broad compatibility)
  target: ['node18'],
  // dts: true,
  shims: true,
  // Explicitly exclude tsup shims from being marked as external
  external,
  tsconfig: 'tsconfig.build.json',
  minify: false,
  removeNodeProtocol: true,
  skipNodeModulesBundle: true,
  clean: true
};

build({
  ...baseOption,
  format: ['cjs', 'esm'],
  banner(ctx) {
    if (ctx.format === 'esm') {
      return {
        js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`
      };
    }
  },
  outExtension({ format }) {
    switch (format) {
      case 'cjs':
        return { js: '.cjs', dts: '.d.cts' };
      case 'esm':
        return { js: '.mjs', dts: '.d.mts' };
      default:
        return { js: '.js', dts: '.d.ts' };
    }
  }
}).catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
