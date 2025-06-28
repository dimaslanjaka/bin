import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  require_isWin
} from "./chunk-JL32QDSH.mjs";
import {
  require_utils
} from "./chunk-OKYLF2MU.mjs";
import {
  init_esm_shims
} from "./chunk-VXZQNLPU.mjs";
import {
  __require
} from "./chunk-FB6YIQYR.mjs";

// src/del-ps.js
init_esm_shims();
var crossSpawn = __require("cross-spawn");
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
