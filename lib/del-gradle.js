var glob = require('glob');
var path = require('sbg-utility').path;
var del = require('./utils').del;
var globStream = new glob.Glob(['**/build.gradle'], {
    withFileTypes: false,
    cwd: process.cwd(),
    ignore: ['**/node_modules/**', '**/vendor/**']
});
globStream.stream().on('data', function (result) {
    var fullPath = path.resolve(process.cwd(), result);
    var base = path.dirname(fullPath);
    var buildFolder = path.join(base, 'build');
    console.log('delete build folder', buildFolder);
    del(buildFolder);
});
