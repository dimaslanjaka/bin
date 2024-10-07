const path = require("upath");
const fs = require("fs");
const glob = require("glob");
const pkgj = require("./package.json");

pkgj.bin = {
  nrs: "lib/npm-run-series.cjs",
  "run-s": "lib/npm-run-series.cjs",
  "run-series": "lib/npm-run-series.cjs",
  "npm-run-series": "lib/npm-run-series.cjs",
  "del-nodemodules": "lib/del-node-modules.cjs",
  "del-yarncaches": "lib/del-yarn-caches.cjs",
  "find-nodemodules": "lib/find-node-modules-cli.cjs",
  "del-ps": "lib/del-ps.cjs",
  "del-gradle": "lib/del-gradle.cjs",
  "git-purge": "lib/git-purge.cjs"
};

glob
  .sync("**/*", {
    cwd: __dirname,
    ignore: [
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
      "**/chunk*"
    ]
  })
  .filter((str) => {
    const resolved = path.join(__dirname, str);
    if ([path.toUnix(__filename)].includes(resolved)) return false;
    return fs.statSync(resolved).isFile();
  })
  .forEach((str) => {
    let basename = path.basename(str).replace(/\./gm, "-");
    pkgj.bin[basename] = path.toUnix(str);
  });

// sort
pkgj.bin = sortObjectByKeys(pkgj.bin);

fs.writeFileSync(path.resolve(__dirname, "package.json"), JSON.stringify(pkgj, null, 2) + "\n");
//cp.sync('yarn', ['install'], { cwd: __dirname });
// copy to test

/**
 * sort object by keys
 * @param {Record<string,any>} object
 * @param {{desc?:boolean}} param1
 * @returns
 */
function sortObjectByKeys(object, { desc = false } = {}) {
  return Object.fromEntries(Object.entries(object).sort(([k1], [k2]) => ((k1 < k2) ^ desc ? -1 : 1)));
}
