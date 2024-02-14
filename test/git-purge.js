const path = require('path');

process.cwd = () => path.resolve(__dirname + '/../../../Repositories');

require('../src/git-purge');
