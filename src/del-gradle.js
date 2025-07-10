const glob = require("glob");
const path = require("upath");
const { del } = require("./utils");

const globStream = new glob.Glob(["**/build.gradle"], {
  withFileTypes: false,
  cwd: process.cwd(),
  ignore: ["**/node_modules/**", "**/vendor/**"]
});

globStream.stream().on("data", (result) => {
  const fullPath = path.resolve(process.cwd(), result);
  const base = path.dirname(fullPath);
  const buildFolder = path.join(base, "build");
  console.log("delete build folder", buildFolder);
  del(buildFolder);
});
