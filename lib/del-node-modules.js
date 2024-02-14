var glob = require('glob');
var delStream = require('./utils').delStream;
var globalIgnore = [
    // ignore .git .github folder
    '**/.git*',
    // ignore composer folder
    '**/vendor/**'
];
console.log('cleaning node_modules in', process.cwd());
var g3 = new glob.Glob('**/node_modules', {
    withFileTypes: false,
    cwd: process.cwd(),
    ignore: globalIgnore
});
delStream(g3);
