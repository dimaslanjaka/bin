const path = require('path');

process.cwd = () => path.resolve(__dirname + '/../../../Repositories');

require('../lib/git-purge');
