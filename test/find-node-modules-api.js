require("./env");

const api = require("../lib/find-node-modules");
const ansiColors = require("ansi-colors");

api(__dirname + "/../", (s) => console.log(ansiColors.greenBright("found"), s)).then((paths) =>
  console.log(`resolved found ${ansiColors.greenBright(paths.length)} node_modules`)
);
