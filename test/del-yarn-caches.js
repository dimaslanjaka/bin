const { path } = require('sbg-utility');

process.cwd = () => path.resolve(__dirname + '/../../../Repositories');

require('../lib/del-yarn-caches');
