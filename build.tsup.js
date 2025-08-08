import path from "upath";
import { build } from "tsup";
import pkgJson from "./package.json" with { type: "json" };

// Packages that should be bundled
const bundledPackages = ["p-limit", "deepmerge-ts", "hexo-is", "is-stream", "markdown-it", "node-cache"];

const externalDeps = [...Object.keys(pkgJson.dependencies), ...Object.keys(pkgJson.devDependencies)].filter(
  (pkgName) => !bundledPackages.includes(pkgName)
);

// Remove any possible tsup shims from the external array
const external = externalDeps.filter((dep) => !path.toUnix(dep).includes("/tsup/assets/"));

/**
 * @type {import("tsup").Options}
 */
const baseOption = {
  outDir: "lib",
  entry: ["./src/**/*.ts", "./src/**/*.js", "./src/**/*.cjs", "./src/**/*.mjs"],
  target: "node14",
  dts: true,
  shims: true,
  // Explicitly exclude tsup shims from being marked as external
  external,
  // splitting: false,
  tsconfig: "tsconfig.build.json",
  minify: false,
  removeNodeProtocol: true,
  skipNodeModulesBundle: true
};

build({
  ...baseOption,
  format: ["cjs", "esm"],
  banner(ctx) {
    if (ctx.format === "esm") {
      return {
        js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`
      };
    }
  },
  outExtension({ format }) {
    switch (format) {
      case "cjs": {
        return { js: ".cjs", dts: ".d.cts" };
      }
      case "esm": {
        return { js: ".mjs", dts: ".d.mts" };
      }
      default: {
        return { js: ".js", dts: ".d.ts" };
      }
    }
  }
}).catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
