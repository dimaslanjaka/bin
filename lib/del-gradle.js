const glob = require('glob');
const path = require('path');
const { fs } = require('sbg-utility');
// process.cwd = () => path.resolve(__dirname + '/../../../Repositories');

const globStream = new glob.Glob(['**/build.gradle'], {
  withFileTypes: false,
  cwd: process.cwd(),
  ignore: ['**/node_modules/**', '**/vendor/**']
});

globStream.stream().on('data', (result) => {
  const fullPath = path.resolve(process.cwd(), result);
  const base = path.dirname(fullPath);
  const buildFolder = path.join(base, 'build');
  console.log('delete build folder', buildFolder);
  if (fs.existsSync(buildFolder) && fs.statSync(buildFolder).isDirectory()) {
    try {
      fs.rmSync(buildFolder, { recursive: true, force: true });
    } catch (error) {
      console.error('cannot delete', buildFolder);
    }
  }
});
