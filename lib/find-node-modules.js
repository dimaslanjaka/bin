const glob = require('glob');
const path = require('path');
const g3 = new glob.Glob('**/node_modules', {
    withFileTypes: false,
    cwd: process.cwd(),
    ignore: ['**/.git*', '**/vendor/**']
});
g3.stream().on('data', (result) => {
    const fullPath = path.resolve(process.cwd(), result);
    console.log(fullPath);
});
