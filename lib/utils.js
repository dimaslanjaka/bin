const { fs, path } = require('sbg-utility');

/**
 * glob stream handler
 * @param {glob.Glob} globStream
 */
function delStream(globStream) {
  globStream.stream().on('data', (result) => {
    const fullPath = path.resolve(process.cwd(), result);
    console.log('deleting', fullPath);
    if (fs.statSync(fullPath).isDirectory()) {
      // delete all files each package directory
      const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
      for (let i = 0; i < subdir.length; i++) {
        const dir = subdir[i];
        del(dir);
      }
    }
    del(fullPath);
  });
}

/**
 * delete file recursive
 * @param {string} fullPath
 */
function del(fullPath) {
  try {
    fs.rmSync(fullPath, { recursive: true, force: true, retryDelay: 7000 });
    console.log('deleted', fullPath);
  } catch (_) {
    console.log('failed delete', fullPath);
  }
}

module.exports = { del, delStream };