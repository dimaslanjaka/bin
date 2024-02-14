var glob = require('glob');
var delStream = require('./utils').delStream;
var g3 = new glob.Glob(['**/.yarn/cache*', '**/.yarn/*.gz'], {
    withFileTypes: false,
    cwd: process.cwd(),
    ignore: ['**/.git*', '**/vendor/**']
});
delStream(g3);
