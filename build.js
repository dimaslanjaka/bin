const path = require("upath");
const fs = require("fs");
const glob = require("glob");
const pkgj = require("./package.json");
const colors = require("ansi-colors");

pkgj.bin = {
  "binary-collections": "lib/binary-collections.cjs",
  nrs: "lib/npm-run-series.cjs",
  "run-s": "lib/npm-run-series.cjs",
  "run-series": "lib/npm-run-series.cjs",
  "npm-run-series": "lib/npm-run-series.cjs",
  "del-nodemodules": "lib/del-node-modules.cjs",
  "del-yarncaches": "lib/del-yarn-caches.cjs",
  "find-nodemodules": "lib/find-node-modules-cli.cjs",
  "del-ps": "lib/del-ps.cjs",
  "del-gradle": "lib/del-gradle.cjs",
  "git-purge": "lib/git-purge.cjs",
  "git-fix": "lib/git-fix.cjs"
};

glob
  .sync("**/*", {
    cwd: __dirname,
    ignore: [
      "**/.vscode/**",
      "**/.idea/**",
      "**/.DS_Store",
      "**/Thumbs.db",
      "**/coverage/**",
      "**/logs/**",
      "**/out/**",
      "**/build/**",
      "**/docs/**",
      "**/examples/**",
      "**/scripts/**",
      "**/benchmarks/**",
      "**/CHANGELOG*",
      "**/node_modules/**",
      "**/boilerplate/**",
      "**/.git*",
      "**/yarn.lock",
      "**/{package,package-lock}.json",
      "**/releases/**",
      "**/tmp/**",
      "**/test/**",
      "**/LICENSE",
      "**/.yarn/**",
      "**/.yarn*",
      "**/dist/**",
      "**/.github/**",
      "**/*.{md,ts,js,txt,log,json,lock}",
      "**/bash-dummy*",
      "**/.yarn*",
      "**/*.txt",
      "**/*.d.*",
      "**/chunk*",
      "**/build.*",
      "**/*tsbuildinfo",
      "**/{ps,git}/**",
      "**/*eslint*",
      "**/*.config.*"
    ]
  })
  .filter((str) => {
    const resolved = path.join(__dirname, str);
    if ([path.toUnix(__filename)].includes(path.toUnix(resolved))) return false;
    return fs.statSync(resolved).isFile();
  })
  .sort((a, b) => {
    // Prioritize paths that include "bin/"
    const aIsBin = path.toUnix(a).includes("bin/");
    const bIsBin = path.toUnix(b).includes("bin/");
    return aIsBin === bIsBin ? 0 : aIsBin ? -1 : 1;
  })
  .forEach((str) => {
    const basename = path.basename(str, path.extname(str));
    const sanitizeName = basename.replace(/\./g, "-");
    const value = path.toUnix(str);

    const isBin = value.includes("bin/");
    const key = isBin ? sanitizeName : basename;
    const coloredKey = isBin ? colors.green(key) : colors.yellow(key);

    console.log(`add ${coloredKey}: ${value}`);
    pkgj.bin[key] = value;
  });

// sort
pkgj.bin = sortObjectByKeys(pkgj.bin);

fs.writeFileSync(path.resolve(__dirname, "package.json"), JSON.stringify(pkgj, null, 2) + "\n");

/**
 * sort object by keys
 * @param {Record<string,any>} object
 * @param {{desc?:boolean}} param1
 * @returns
 */
function sortObjectByKeys(object, { desc = false } = {}) {
  return Object.fromEntries(Object.entries(object).sort(([k1], [k2]) => ((k1 < k2) ^ desc ? -1 : 1)));
}
