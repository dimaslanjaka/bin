const crossSpawn = require("cross-spawn");
const ps = require("ps-node");
const isWin = require("./ps/isWin");
const utils = require("./utils");

utils.getArgs()._.forEach((command) => {
  ps.lookup(
    {
      command,
      psargs: "ux"
    },
    function (err, resultList) {
      if (err) {
        throw new Error(err);
      }

      resultList.forEach(function (process) {
        if (process) {
          // console.log('PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments);
          if (!isWin) {
            crossSpawn.spawnAsync("kill", ["-9", process.pid]).catch((e) => console.log(`kill failed ${e.message}`));
            crossSpawn
              .spawnAsync("killall", ["-9", process.pid])
              .catch((e) => console.log(`killall failed ${e.message}`));
          } else {
            // wmic process where "name like 'java.exe'" delete
            crossSpawn
              .spawnAsync("wmic", ["process", "where", `"name like '${command}'" delete`])
              .catch((e) => console.log(`wmic failed ${e.message}`));
          }
        }
      });
    }
  );
});
