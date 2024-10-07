// src/utils.js
var { fs, path } = require("sbg-utility");
var argv = require("minimist")(process.argv.slice(2));
function getArgs() {
  return argv;
}
function del(fullPath) {
  if (fs.statSync(fullPath).isDirectory()) {
    const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
    for (let i = 0; i < subdir.length; i++) {
      del(subdir[i]);
    }
  } else {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true, retryDelay: 7e3 });
      console.log("deleted", fullPath);
    } catch (_) {
      console.log("failed delete", fullPath);
    }
  }
}
function delStream(globStream) {
  globStream.stream().on("data", (result) => {
    const fullPath = path.resolve(process.cwd(), result);
    if (fs.statSync(fullPath).isDirectory()) {
      const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
      for (let i = 0; i < subdir.length; i++) {
        del(subdir[i]);
      }
    }
    del(fullPath);
  });
}
var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
module.exports = { del, delStream, getArgs, delay };
