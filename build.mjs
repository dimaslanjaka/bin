import color from "ansi-colors";
import fs from "fs-extra";
import * as glob from "glob";
import path from "upath";
import { fileURLToPath } from "url";
import pkg from "./package.json" with { type: "json" };

// Polyfill __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define default binary mappings for package.json "bin" field
const defaultBin = {
  "binary-collections": "lib/binary-collections.cjs",
  nrs: "lib/npm-run-series.cjs",
  "run-s": "lib/npm-run-series.cjs",
  "run-series": "lib/npm-run-series.cjs",
  "npm-run-series": "lib/npm-run-series.cjs",
  "del-nodemodules": "lib/del-node-modules.cjs",
  "del-yarncaches": "lib/del-yarn-caches.cjs",
  "del-ps": "lib/del-ps.cjs",
  "del-gradle": "lib/del-gradle.cjs",
  "git-purge": "lib/git-purge.cjs",
  "git-fix": "lib/git-fix.cjs",
  "print-tree": "lib/print-directory-tree.cjs",
  "dir-tree": "lib/print-directory-tree.cjs",
  "pkg-resolutions-updater": "lib/package-resolutions-updater.cjs",
  "pkg-res-updater": "lib/package-resolutions-updater.cjs",
  "git-diff": "lib/git-diff.cjs",
  "clean-github-actions-caches": "lib/clean-github-actions-caches.cjs",
  "clean-github-actions-cache": "lib/clean-github-actions-caches.cjs",
  "clear-github-actions-cache": "lib/clean-github-actions-caches.cjs",
  "clear-github-actions-caches": "lib/clean-github-actions-caches.cjs",
  "clear-gh-caches": "lib/clean-github-actions-caches.cjs",
  "submodule-install": "lib/submodule-install.cjs"
};

// Build binary mapping from lib/*.cjs and bin/*
const binBuilder = {};
const libs = glob
  .globSync("lib/*.cjs", {
    cwd: __dirname,
    nodir: true,
    ignore: [
      "**/*.d.{ts,mts,cts}",
      "**/*.txt",
      "**/*.d.*",
      "**/chunk*",
      "**/build.*",
      "**/{ps,git}/**",
      "**/index.*",
      "**/*.config.*",
      "**/utils.*",
      "**/*-config.*"
    ]
  })
  .map((file) => {
    // For each lib/*.cjs, find matching bin/*
    const filename = path.basename(file, path.extname(file));
    const bins = glob.globSync(`bin/${filename}*`, { cwd: __dirname, nodir: true });
    return { file, filename, bins };
  });

// Assign binaries to binBuilder, preferring defaultBin if present
for (const { file, filename, bins } of libs) {
  if (defaultBin[filename]) {
    binBuilder[filename] = defaultBin[filename];
    continue;
  }
  if (bins.length === 0) {
    binBuilder[filename] = file;
  } else {
    // If local bin exists, log and use lib/*.cjs
    console.log(
      `${color.yellow(filename)} contains local bin: [${color.blueBright(bins.join(", "))}] use ${color.greenBright(file)} instead`
    );
    binBuilder[filename] = file;
  }
}

// Ensure binaries directory exists and is empty
fs.ensureDirSync(path.resolve(__dirname, "binaries"));
fs.emptyDirSync(path.resolve(__dirname, "binaries"));

// Build ignore list for bin/* files already mapped
const binIgnores = Object.keys({ ...binBuilder, ...defaultBin })
  .map((key) => `bin/${key}*`)
  .concat("**/*.txt", "**/*dummy*", "**/bc*");

// Copy remaining bin/* files to binaries/ and add binary-executor for each
const binFiles = glob
  .globSync("bin/*", {
    cwd: __dirname,
    nodir: true,
    ignore: binIgnores
  })
  .map((file) => {
    const absolute = path.resolve(__dirname, file);
    const destination = path.join(__dirname, "binaries", path.basename(file));
    const filename = path.basename(file, path.extname(file));
    // Copy binary file to binaries directory
    fs.copySync(absolute, destination);
    // Copy binary-executor.cjs for each binary
    const executorDestination = path.join(__dirname, `binaries/${filename}.cjs`);
    fs.copySync(path.resolve(__dirname, "bin/binary-executor.cjs"), executorDestination);
    return { filename, executorDestination };
  });

// Log each added binary
for (const { filename, executorDestination } of binFiles) {
  // Log the binary and executor paths
  console.log(`${filename}:`);
  const relativeExecutor = path.relative(__dirname, executorDestination);
  // console.log(`  ${color.yellow(executorDestination)} -> ${color.blueBright(relativeExecutor)}`);
  binBuilder[filename] = relativeExecutor; // Update binBuilder with executor path
}

// Build final bin mapping for package.json
const bin = Object.keys({ ...binBuilder, ...defaultBin })
  .sort()
  .reduce((acc, key) => {
    acc[key] = path.toUnix(binBuilder[key] || defaultBin[key]);
    return acc;
  }, {});

// Assign bin mapping to package.json
pkg.bin = bin;

// Reconstruct package.json with preferred key order
const orderedKeys = [
  "name",
  "version",
  "description",
  "keywords",
  "homepage",
  "bugs",
  "license",
  "author",
  "funding",
  "type",
  "main",
  "module",
  "exports",
  "types",
  "typings",
  "files",
  "bin",
  "scripts",
  "repository",
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
  "engines",
  "os",
  "cpu",
  "private",
  "publishConfig"
];
// Helper to order package.json keys
function reconstructPackageJson(obj, keyOrder) {
  const result = {};
  for (const key of keyOrder) {
    if (key in obj) result[key] = obj[key];
  }
  for (const key of Object.keys(obj)) {
    if (!keyOrder.includes(key)) result[key] = obj[key];
  }
  return result;
}
const orderedPkg = reconstructPackageJson(pkg, orderedKeys);
// Write updated package.json
fs.writeFileSync(path.resolve(__dirname, "package.json"), JSON.stringify(orderedPkg, null, 2) + "\n");
console.log(color.greenBright(`Updated package.json with ${Object.keys(bin).length} binaries`));
console.log(color.greenBright(`package.json written successfully!`));
