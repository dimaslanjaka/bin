var ChildProcess = require("child_process");
var IS_WIN = require("./isWin");
var TableParser = require("./table-parser");

/**
 * End of line.
 * Basically, the EOL should be:
 * - windows: \r\n
 * - *nix: \n
 * But i'm trying to get every possibilities covered.
 */
var EOL = /(\r\n)|(\n\r)|\n|\r/;
var SystemEOL = require("os").EOL;

// ps-node

/**
 * Execute child process
 * @type {Function}
 * @param {String[]} args
 * @param {Function} callback
 * @param {Object=null} callback.err
 * @param {Object[]} callback.stdout
 */

var Exec =
  (module.exports =
  exports =
    function (args, callback) {
      var spawn = ChildProcess.spawn;

      // on windows, if use ChildProcess.exec(`wmic process get`), the stdout will gives you nothing
      // that's why I use `cmd` instead
      if (IS_WIN) {
        var CMD = spawn("cmd");
        var stdout = "";
        var stderr = null;

        CMD.stdout.on("data", function (data) {
          stdout += data.toString();
        });

        CMD.stderr.on("data", function (data) {
          if (stderr === null) {
            stderr = data.toString();
          } else {
            stderr += data.toString();
          }
        });

        CMD.on("exit", function () {
          var beginRow;
          stdout = stdout.split(EOL);

          // Find the line index for the titles
          stdout.forEach(function (out, index) {
            if (out && typeof beginRow == "undefined" && out.indexOf("CommandLine") === 0) {
              beginRow = index;
            }
          });

          // get rid of the start (copyright) and the end (current pwd)
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

        child.stdout.on("data", function (data) {
          stdout += data.toString();
        });

        child.stderr.on("data", function (data) {
          if (stderr === null) {
            stderr = data.toString();
          } else {
            stderr += data.toString();
          }
        });

        child.on("exit", function () {
          if (stderr) {
            return callback(stderr.toString());
          } else {
            callback(null, stdout || false);
          }
        });
      }
    });

/**
 * Query Process: Focus on pid & cmd
 * @param query
 * @param {String|String[]} query.pid
 * @param {String} query.command RegExp String
 * @param {String} query.arguments RegExp String
 * @param {String|array} query.psargs
 * @param {Function} callback
 * @param {Object=null} callback.err
 * @param {Object[]} callback.processList
 * @return {Object}
 */

exports.lookup = function (query, callback) {
  /**
   * add 'lx' as default ps arguments, since the default ps output in linux like "ubuntu", wont include command arguments
   */
  var exeArgs = query.psargs || ["lx"];
  var filter = {};
  var idList;

  // Lookup by PID
  if (query.pid) {
    if (Array.isArray(query.pid)) {
      idList = query.pid;
    } else {
      idList = [query.pid];
    }

    // Cast all PIDs as Strings
    idList = idList.map(function (v) {
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

  return Exec(exeArgs, function (err, output) {
    if (err) {
      return callback(err);
    } else {
      var processList = parseGrid(output);
      var resultList = [];

      processList.forEach(function (p) {
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

/**
 * Kill process
 * @param pid
 * @param {Object|String} signal
 * @param {String} signal.signal
 * @param {number} signal.timeout
 * @param next
 */

exports.kill = function (pid, signal, next) {
  //opts are optional
  if (arguments.length == 2 && typeof signal == "function") {
    next = signal;
    signal = undefined;
  }

  var checkTimeoutSeconds = (signal && signal.timeout) || 30;

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
    exports.lookup({ pid: pid }, function (err, list) {
      if (checkIsTimeout) return;

      if (err) {
        clearTimeout(checkTimeoutTimer);
        if (finishCallback) finishCallback(err);
      } else if (list.length > 0) {
        checkConfident = checkConfident - 1 || 0;
        checkKilled(finishCallback);
      } else {
        checkConfident++;
        if (checkConfident === 5) {
          clearTimeout(checkTimeoutTimer);
          if (finishCallback) finishCallback();
        } else {
          checkKilled(finishCallback);
        }
      }
    });
  }

  if (next) checkKilled(next);

  checkTimeoutTimer =
    next &&
    setTimeout(function () {
      checkIsTimeout = true;
      next(new Error("Kill process timeout"));
    }, checkTimeoutSeconds * 1000);
};

/**
 * Parse the stdout into readable object.
 * @param {String} output
 */

function parseGrid(output) {
  if (!output) {
    return [];
  }
  return formatOutput(TableParser.parse(output));
}

/**
 * format the structure, extract pid, command, arguments, ppid
 * @param data
 * @return {Array}
 */

function formatOutput(data) {
  var formatedData = [];
  data.forEach(function (d) {
    var pid = (d.PID && d.PID[0]) || (d.ProcessId && d.ProcessId[0]) || undefined;
    var cmd = d.CMD || d.CommandLine || d.COMMAND || undefined;
    var ppid = (d.PPID && d.PPID[0]) || (d.ParentProcessId && d.ParentProcessId[0]) || undefined;

    if (pid && cmd) {
      var command = cmd[0];
      var args = "";

      if (cmd.length > 1) {
        args = cmd.slice(1);
      }

      formatedData.push({
        pid: pid,
        command: command,
        arguments: args,
        ppid: ppid
      });
    }
  });

  return formatedData;
}
