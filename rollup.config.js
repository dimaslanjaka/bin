import path from "upath";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import { glob } from "glob";
import pkgJson from "./package.json" with { type: "json" };

const { author, dependencies = {}, devDependencies = {}, name, version } = pkgJson;

// Packages that should be bundled (from tsup config)
const bundledPackages = ["p-limit", "deepmerge-ts", "hexo-is", "is-stream", "markdown-it", "node-cache"];

const externalDeps = [...Object.keys(dependencies), ...Object.keys(devDependencies)].filter(
  (pkgName) => !bundledPackages.includes(pkgName)
);

// Remove any possible tsup shims from the external array
const external = externalDeps.filter((dep) => !path.toUnix(dep).includes("/tsup/assets/"));

/**
 * Rollup external filter function.
 * @param {string} source - The import path or module ID.
 * @param {string} importer - The path of the importing file.
 * @param {boolean} isResolved - Whether the import has been resolved.
 * @returns {boolean} True if the module should be external, false if it should be bundled.
 */
function externalFilter(source, _importer, _isResolved) {
  function getPackageNameFromSource(source) {
    // Handle absolute paths (Windows/Unix)
    const nm = /node_modules[\\/]+([^\\/]+)(?:[\\/]+([^\\/]+))?/.exec(source);
    if (nm) {
      // Scoped package
      if (nm[1].startsWith("@") && nm[2]) {
        return nm[1] + "/" + nm[2];
      }
      return nm[1];
    }
    // Handle bare imports
    if (source.startsWith("@")) {
      return source.split("/").slice(0, 2).join("/");
    }
    return source.split("/")[0];
  }

  const pkgName = getPackageNameFromSource(source);
  const isBundled = bundledPackages.includes(pkgName);
  const isExternal = external.includes(pkgName);

  if (isBundled) return false; // force bundle
  if (isExternal) return true; // mark as external
  return false; // fallback: bundle it
}

const banner = `// ${name} ${version} by ${author.name} <${author.email}> (${author.url})`.trim();

/**
 * Create require function for ESM banner (equivalent to tsup's banner)
 */
const esmBanner = `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`;

/**
 * @type {import('rollup').RollupOptions['plugins']}
 */
const plugins = [
  nodeResolve({
    extensions: [".js", ".ts", ".cjs", ".mjs", ".json", ".node"],
    preferBuiltins: true
  }),
  commonjs({
    // Convert CommonJS modules to ES modules
    transformMixedEsModules: true
  }),
  json(),
  babel({
    babelHelpers: "bundled",
    extensions: [".js", ".ts", ".cjs", ".mjs"],
    exclude: "**/node_modules/**",
    presets: [
      [
        "@babel/preset-env",
        {
          targets: {
            node: "14" // equivalent to tsup's target: "node14"
          }
        }
      ]
    ]
  })
];

/**
 * TypeScript-specific plugins
 */
const tsPlugins = [
  nodeResolve({
    extensions: [".js", ".ts", ".cjs", ".mjs", ".json", ".node"],
    preferBuiltins: true
  }),
  commonjs({
    transformMixedEsModules: true
  }),
  json(),
  babel({
    babelHelpers: "bundled",
    extensions: [".js", ".ts", ".cjs", ".mjs"],
    exclude: "**/node_modules/**",
    presets: [
      "@babel/preset-typescript",
      [
        "@babel/preset-env",
        {
          targets: {
            node: "14"
          }
        }
      ]
    ]
  })
];

/**
 * @type {import('rollup').RollupOptions[]}
 */
const configs = [];

// Get all entry files (equivalent to tsup's entry pattern)
const entries = glob.sync("src/**/*.{js,ts,cjs,mjs}", { nodir: true });

for (const entry of entries) {
  const entryName = path.basename(entry, path.extname(entry));
  const isTypeScript = entry.endsWith(".ts");

  // CJS output
  configs.push({
    input: entry,
    output: {
      file: `lib/${entryName}.cjs`,
      format: "cjs",
      banner,
      exports: "auto"
    },
    plugins: isTypeScript ? tsPlugins : plugins,
    external: externalFilter
  });

  // ESM output
  configs.push({
    input: entry,
    output: {
      file: `lib/${entryName}.mjs`,
      format: "esm",
      banner: `${banner}\n${esmBanner}`,
      exports: "auto"
    },
    plugins: isTypeScript ? tsPlugins : plugins,
    external: externalFilter
  });
}

export default configs;
