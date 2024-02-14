var glob = require('glob');
var path = require('path');
var g3 = new glob.Glob('**/node_modules', {
    withFileTypes: false,
    cwd: process.cwd(),
    ignore: ['**/.git*', '**/vendor/**']
});
g3.stream().on('data', function (result) {
    var fullPath = path.resolve(process.cwd(), result);
    console.log(fullPath);
});
