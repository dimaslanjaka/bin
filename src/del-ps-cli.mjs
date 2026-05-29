import { spawnAsync } from 'cross-spawn';
import { lookup } from 'ps-node';
import { isWindows } from './utils/isWindows.js';
import { getArgs } from './utils/index.cjs';

getArgs()._.forEach((command) => {
  lookup(
    {
      command,
      psargs: 'ux'
    },
    function (err, resultList) {
      if (err) {
        throw new Error(err);
      }

      resultList.forEach(function (process) {
        if (process) {
          // console.log('PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments);
          if (!isWindows()) {
            spawnAsync('kill', ['-9', process.pid]).catch((e) => console.log(`kill failed ${e.message}`));
            spawnAsync('killall', ['-9', process.pid]).catch((e) => console.log(`killall failed ${e.message}`));
          } else {
            // wmic process where "name like 'java.exe'" delete
            spawnAsync('wmic', ['process', 'where', `"name like '${command}'" delete`]).catch((e) =>
              console.log(`wmic failed ${e.message}`)
            );
          }
        }
      });
    }
  );
});
