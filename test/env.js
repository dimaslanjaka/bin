const { path } = require('sbg-utility');
const fs = require('fs-extra');

process.cwd = () => {
  const paths = [
    path.join(__dirname, '/../../../Repositories'),
    path.join(__dirname, '/../../../'),
    path.join(__dirname, '/../../'),
    path.join(__dirname, '/..')
  ];
  return paths.filter(fs.existsSync)[0];
};
