import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import {
  require_table_parser
} from "../chunk-BPYMYNIR.mjs";
import "../chunk-V5V56PTK.mjs";
import {
  require_isWin
} from "../chunk-QB6FRJPO.mjs";
import {
  init_esm_shims
} from "../chunk-FVVYUJVB.mjs";
import {
  __commonJS,
  __require
} from "../chunk-FB6YIQYR.mjs";

// src/ps/index.js
var require_ps = __commonJS({
  "src/ps/index.js"(exports, module) {
    init_esm_shims();
    var ChildProcess = __require("child_process");
    var IS_WIN = require_isWin();
    var TableParser = require_table_parser();
    var EOL = /(\r\n)|(\n\r)|\n|\r/;
    var SystemEOL = __require("os").EOL;
    var Exec = module.exports = exports = function(args, callback) {
      var spawn = ChildProcess.spawn;
      if (IS_WIN) {
        var CMD = spawn("cmd");
        var stdout = "";
        var stderr = null;
        CMD.stdout.on("data", function(data) {
          stdout += data.toString();
        });
        CMD.stderr.on("data", function(data) {
          if (stderr === null) {
            stderr = data.toString();
          } else {
            stderr += data.toString();
          }
        });
        CMD.on("exit", function() {
          var beginRow;
          stdout = stdout.split(EOL);
          stdout.forEach(function(out, index) {
            if (out && typeof beginRow == "undefined" && out.indexOf("CommandLine") === 0) {
              beginRow = index;
            }
          });
          stdout.splice(stdout.length - 1, 1);
          stdout.splice(0, beginRow);
          callback(stderr, stdout.join(SystemEOL) || false);
        });
        CMD.stdin.write("wmic process get ProcessId,ParentProcessId,CommandLine \n");
        CMD.stdin.end();
      } else {
        if (typeof args === "string") {
          args = args.split(/\s+/);
        }
        const child = spawn("ps", args);
        stdout = "";
        stderr = null;
        child.stdout.on("data", function(data) {
          stdout += data.toString();
        });
        child.stderr.on("data", function(data) {
          if (stderr === null) {
            stderr = data.toString();
          } else {
            stderr += data.toString();
          }
        });
        child.on("exit", function() {
          if (stderr) {
            return callback(stderr.toString());
          } else {
            callback(null, stdout || false);
          }
        });
      }
    };
    exports.lookup = function(query, callback) {
      var exeArgs = query.psargs || ["lx"];
      var filter = {};
      var idList;
      if (query.pid) {
        if (Array.isArray(query.pid)) {
          idList = query.pid;
        } else {
          idList = [query.pid];
        }
        idList = idList.map(function(v) {
          return String(v);
        });
      }
      if (query.command) {
        filter["command"] = new RegExp(query.command, "i");
      }
      if (query.arguments) {
        filter["arguments"] = new RegExp(query.arguments, "i");
      }
      if (query.ppid) {
        filter["ppid"] = new RegExp(query.ppid);
      }
      return Exec(exeArgs, function(err, output) {
        if (err) {
          return callback(err);
        } else {
          var processList = parseGrid(output);
          var resultList = [];
          processList.forEach(function(p) {
            var flt;
            var type;
            var result = true;
            if (idList && idList.indexOf(String(p.pid)) < 0) {
              return;
            }
            for (type in filter) {
              flt = filter[type];
              result = flt.test(p[type]) ? result : false;
            }
            if (result) {
              resultList.push(p);
            }
          });
          callback(null, resultList);
        }
      });
    };
    exports.kill = function(pid, signal, next) {
      if (arguments.length == 2 && typeof signal == "function") {
        next = signal;
        signal = void 0;
      }
      var checkTimeoutSeconds = signal && signal.timeout || 30;
      if (typeof signal === "object") {
        signal = signal.signal;
      }
      try {
        process.kill(pid, signal);
      } catch (e) {
        return next && next(e);
      }
      var checkConfident = 0;
      var checkTimeoutTimer = null;
      var checkIsTimeout = false;
      function checkKilled(finishCallback) {
        exports.lookup({ pid }, function(err, list) {
          if (checkIsTimeout) return;
          if (err) {
            clearTimeout(checkTimeoutTimer);
            finishCallback && finishCallback(err);
          } else if (list.length > 0) {
            checkConfident = checkConfident - 1 || 0;
            checkKilled(finishCallback);
          } else {
            checkConfident++;
            if (checkConfident === 5) {
              clearTimeout(checkTimeoutTimer);
              finishCallback && finishCallback();
            } else {
              checkKilled(finishCallback);
            }
          }
        });
      }
      next && checkKilled(next);
      checkTimeoutTimer = next && setTimeout(function() {
        checkIsTimeout = true;
        next(new Error("Kill process timeout"));
      }, checkTimeoutSeconds * 1e3);
    };
    function parseGrid(output) {
      if (!output) {
        return [];
      }
      return formatOutput(TableParser.parse(output));
    }
    function formatOutput(data) {
      var formatedData = [];
      data.forEach(function(d) {
        var pid = d.PID && d.PID[0] || d.ProcessId && d.ProcessId[0] || void 0;
        var cmd = d.CMD || d.CommandLine || d.COMMAND || void 0;
        var ppid = d.PPID && d.PPID[0] || d.ParentProcessId && d.ParentProcessId[0] || void 0;
        if (pid && cmd) {
          var command = cmd[0];
          var args = "";
          if (cmd.length > 1) {
            args = cmd.slice(1);
          }
          formatedData.push({
            pid,
            command,
            arguments: args,
            ppid
          });
        }
      });
      return formatedData;
    }
  }
});
export default require_ps();
