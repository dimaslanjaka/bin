const { fs, path } = require('sbg-utility');
const argv = require('minimist')(process.argv.slice(2));
function getArgs() {
    return argv;
}
/**
 * glob stream handler
 * @param {glob.Glob} globStream
 */
function delStream(globStream) {
    globStream.stream().on('data', (result) => {
        const fullPath = path.resolve(process.cwd(), result);
        if (fs.statSync(fullPath).isDirectory()) {
            // delete all files each package directory
            const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
            for (let i = 0; i < subdir.length; i++) {
                del(subdir[i]);
            }
        }
        del(fullPath);
    });
}
/**
 * delete file recursive
 * @param {string} fullPath
 */
function del(fullPath) {
    if (fs.statSync(fullPath).isDirectory()) {
        // delete all files each package directory
        const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
        for (let i = 0; i < subdir.length; i++) {
            del(subdir[i]);
        }
    }
    else {
        try {
            fs.rmSync(fullPath, { recursive: true, force: true, retryDelay: 7000 });
            console.log('deleted', fullPath);
        }
        catch (_) {
            console.log('failed delete', fullPath);
        }
    }
}
/**
 * async delayed
 * @param {number} ms
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
module.exports = { del, delStream, getArgs, delay };
