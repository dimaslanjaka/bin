var crossSpawn = require('cross-spawn');
var ps = require('ps-node');
var isWin = require('./ps/isWin');
var utils = require('./utils');
utils.getArgs()._.forEach(function (command) {
    ps.lookup({
        command: command,
        psargs: 'ux'
    }, function (err, resultList) {
        if (err) {
            throw new Error(err);
        }
        resultList.forEach(function (process) {
            if (process) {
                // console.log('PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments);
                if (!isWin) {
                    crossSpawn.spawnAsync('kill', ['-9', process.pid]).catch(function (e) { return console.log("kill failed ".concat(e.message)); });
                    crossSpawn
                        .spawnAsync('killall', ['-9', process.pid])
                        .catch(function (e) { return console.log("killall failed ".concat(e.message)); });
                }
                else {
                    // wmic process where "name like 'java.exe'" delete
                    crossSpawn
                        .spawnAsync('wmic', ['process', 'where', "\"name like '".concat(command, "'\" delete")])
                        .catch(function (e) { return console.log("wmic failed ".concat(e.message)); });
                }
            }
        });
    });
});
