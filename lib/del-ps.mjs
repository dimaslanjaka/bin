import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  require_isWin
} from "./chunk-E75HJFJO.mjs";
import {
  require_dist
} from "./chunk-S4SJ7SDW.mjs";
import {
  require_utils
} from "./chunk-LPLPQBYP.mjs";
import {
  init_esm_shims
} from "./chunk-7MSZ52XC.mjs";
import {
  __require
} from "./chunk-AVDT32AY.mjs";

// src/del-ps.js
init_esm_shims();
var crossSpawn = require_dist();
var ps = __require("ps-node");
var isWin = require_isWin();
var utils = require_utils();
utils.getArgs()._.forEach((command) => {
  ps.lookup(
    {
      command,
      psargs: "ux"
    },
    function(err, resultList) {
      if (err) {
        throw new Error(err);
      }
      resultList.forEach(function(process) {
        if (process) {
          if (!isWin) {
            crossSpawn.spawnAsync("kill", ["-9", process.pid]).catch((e) => console.log(`kill failed ${e.message}`));
            crossSpawn.spawnAsync("killall", ["-9", process.pid]).catch((e) => console.log(`killall failed ${e.message}`));
          } else {
            crossSpawn.spawnAsync("wmic", ["process", "where", `"name like '${command}'" delete`]).catch((e) => console.log(`wmic failed ${e.message}`));
          }
        }
      });
    }
  );
});
