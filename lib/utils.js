var _a = require('sbg-utility'), fs = _a.fs, path = _a.path;
var argv = require('minimist')(process.argv.slice(2));
function getArgs() {
    return argv;
}
/**
 * glob stream handler
 * @param {glob.Glob} globStream
 */
function delStream(globStream) {
    globStream.stream().on('data', function (result) {
        var fullPath = path.resolve(process.cwd(), result);
        if (fs.statSync(fullPath).isDirectory()) {
            // delete all files each package directory
            var subdir = fs.readdirSync(fullPath).map(function (dirPath) { return path.resolve(fullPath, dirPath); });
            for (var i = 0; i < subdir.length; i++) {
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
        var subdir = fs.readdirSync(fullPath).map(function (dirPath) { return path.resolve(fullPath, dirPath); });
        for (var i = 0; i < subdir.length; i++) {
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
var delay = function (ms) { return new Promise(function (resolve) { return setTimeout(resolve, ms); }); };
module.exports = { del: del, delStream: delStream, getArgs: getArgs, delay: delay };
