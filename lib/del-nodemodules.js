const glob = require('glob');
const { fs, path } = require('sbg-utility');
process.cwd = () => path.resolve(__dirname + '/../../../Repositories');

const globalIgnore = [
  // ignore .git .github folder
  '**/.git*',
  // ignore composer folder
  '**/vendor/**'
];

console.log('cleaning node_modules in', process.cwd());

const g3 = new glob.Glob('**/node_modules', {
  withFileTypes: false,
  cwd: process.cwd(),
  ignore: globalIgnore
});
streamDel(g3);

/**
 * glob stream handler
 * @param {glob.Glob} globStream
 */
function streamDel(globStream) {
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
