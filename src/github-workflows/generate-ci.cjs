const path = require('upath');
const fs = require('fs-extra');
const cp = require('cross-spawn');

function generateCI(cwd = undefined) {
  const scripts = ['generate-test-ci-step-cli'].map((name) => {
    const exts = ['.cjs', '.mjs'];
    const searchDir = [__dirname, path.join(__dirname, '..'), path.join(__dirname, '../..')];
    if (cwd) {
      searchDir.push(
        cwd,
        path.join(cwd, 'node_modules/binary-collections/lib'),
        path.join(cwd, 'node_modules/binary-collections/binaries')
      );
    }
    for (const ext of exts) {
      for (const dir of searchDir) {
        const filePath = path.join(dir, `${name}${ext}`);
        if (fs.existsSync(filePath)) return filePath;
      }
    }
    throw new Error(`Could not find executable for ${name}`);
  });

  for (const script of scripts) {
    cp.spawnSync('node', [script], { stdio: 'inherit' });
  }
}

module.exports = generateCI;
