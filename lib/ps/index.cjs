var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/tsup/assets/cjs_shims.js
var init_cjs_shims = __esm({
  "node_modules/tsup/assets/cjs_shims.js"() {
  }
});

// src/ps/isWin.js
var require_isWin = __commonJS({
  "src/ps/isWin.js"(exports2, module2) {
    init_cjs_shims();
    var isWin = process.platform === "win32";
    module2.exports = isWin;
  }
});

// src/ps/connected-domain.js
var require_connected_domain = __commonJS({
  "src/ps/connected-domain.js"(exports2, module2) {
    init_cjs_shims();
    module2.exports = function(tdArray, indicator, hardlink) {
      hardlink = hardlink || false;
      if (!tdArray) {
        throw new Error("tdArray must be provided");
      }
      if (!indicator) {
        throw new Error("indicator must be provided");
      }
      tdArray = JSON.parse(JSON.stringify(tdArray));
      var domains = {};
      var domainUUID = 0;
      var pointsHash = {};
      tdArray.forEach(function(row, y) {
        row.forEach(function(colItem, x) {
          var identifier2 = indicator(colItem, x, y);
          var neighbours = [];
          if (tdArray[y - 1] && tdArray[y - 1][x] !== void 0) {
            neighbours.push(pointsHash[x + "_" + (y - 1)]);
          }
          if (row[x - 1] !== void 0) {
            neighbours.push(pointsHash[x - 1 + "_" + y]);
          }
          if (!hardlink) {
            if (tdArray[y - 1] && tdArray[y - 1][x - 1] !== void 0) {
              neighbours.push(pointsHash[x - 1 + "_" + (y - 1)]);
            }
            if (tdArray[y - 1] && tdArray[y - 1][x + 1] !== void 0) {
              neighbours.push(pointsHash[x + 1 + "_" + (y - 1)]);
            }
          }
          if (neighbours.length) {
            var matched = false;
            neighbours.forEach(function(neighbour) {
              if (neighbour.identifier == identifier2) {
                if (!matched) {
                  addPointToDomain(colItem, x, y, neighbour.domainId);
                  matched = true;
                } else {
                  var colItemPoint = pointsHash[x + "_" + y];
                  if (neighbour.domainId != colItemPoint.domainId) {
                    mergeDomains(neighbour.domainId, colItemPoint.domainId);
                  }
                }
              }
            });
            if (!matched) {
              addNewDomain(colItem, x, y, identifier2);
            }
          } else {
            addNewDomain(colItem, x, y, identifier2);
          }
        });
      });
      var result = {
        domains: [],
        totalDomains: 0,
        groupByIdentifier: {},
        totalIdentifiers: 0
      };
      var domainId = null;
      var identifier = null;
      var domain = null;
      for (domainId in domains) {
        domain = domains[domainId];
        domain.bounding = calculateBounding(domain.points);
        identifier = domain.identifier;
        result.domains.push(domain);
        result.totalDomains++;
        if (!(identifier in result.groupByIdentifier)) {
          result.groupByIdentifier[identifier] = [];
          result.totalIdentifiers++;
        }
        result.groupByIdentifier[identifier].push(domain);
      }
      function calculateBounding(points) {
        var minX = null;
        var minY = null;
        var maxX = null;
        var maxY = null;
        points.forEach(function(point) {
          if (minX === null || point.x < minX) {
            minX = point.x;
          }
          if (minY === null || point.y < minY) {
            minY = point.y;
          }
          if (maxX === null || point.x > maxX) {
            maxX = point.x;
          }
          if (maxY === null || point.y > maxY) {
            maxY = point.y;
          }
        });
        var w = maxX - minX;
        var h = maxY - minY;
        return {
          x: minX,
          y: minY,
          w,
          h
        };
      }
      function addNewDomain(point, x, y, identifier2) {
        var newDomain = {
          identifier: identifier2,
          domainId: ++domainUUID,
          bounding: {},
          points: []
        };
        var newPoint = {
          value: point,
          x,
          y,
          identifier: identifier2,
          domainId: newDomain.domainId
        };
        pointsHash[x + "_" + y] = {
          value: point,
          identifier: identifier2,
          domainId: newDomain.domainId
        };
        newDomain.points.push(newPoint);
        domains[newDomain.domainId] = newDomain;
      }
      function addPointToDomain(point, x, y, domainId2) {
        var domain2 = domains[domainId2];
        var newPoint = {
          value: point,
          x,
          y,
          identifier: domain2.identifier,
          domainId: domainId2
        };
        pointsHash[x + "_" + y] = {
          value: point,
          identifier: domain2.identifier,
          domainId: domainId2
        };
        domain2.points.push(newPoint);
      }
      function mergeDomains(domainAId, domainBId) {
        var domainA = domains[domainAId];
        var domainB = domains[domainBId];
        if (domainA.identifier == domainB.identifier) {
          domainB.domainId = domainA.domainId;
          domainB.points.forEach(function(point) {
            point.domainId = domainA.domainId;
            pointsHash[point.x + "_" + point.y].domainId = domainA.domainId;
          });
          domainA.points = domainA.points.concat(domainB.points);
          delete domains[domainBId];
        }
      }
      return result;
    };
  }
});

// src/ps/table-parser.js
var require_table_parser = __commonJS({
  "src/ps/table-parser.js"(exports2, module2) {
    init_cjs_shims();
    var ConnectedDomain = require_connected_domain();
    var EMPTY_EX = /\s/;
    module2.exports.parse = function(output) {
      var linesTmp = output.split(/(\r\n)|(\n\r)|\n|\r/);
      var lines = [];
      var titleInfo = {};
      var twoDimArray = [];
      linesTmp.forEach(function(line) {
        if (line && line.trim()) {
          lines.push(line);
        }
      });
      lines.forEach(function(line, index) {
        if (index == 0) {
          var fields = line.split(/\s+/);
          var currentIndex = 0;
          fields.forEach(function(field, idx) {
            if (field) {
              var info = titleInfo[field] = {};
              var indexBegin = line.indexOf(field, currentIndex);
              var indexEnd = currentIndex = indexBegin + field.length;
              if (idx == 0) {
                info.titleBegin = 0;
              } else {
                info.titleBegin = indexBegin;
              }
              if (idx == fields.length - 1) {
                info.titleEnd = line.length - 1;
              } else {
                info.titleEnd = indexEnd;
              }
            }
          });
        } else {
          twoDimArray[index - 1] = line.split("");
        }
      });
      var connectedDomains = ConnectedDomain(
        twoDimArray,
        function(value) {
          if (EMPTY_EX.test(value)) {
            return -1;
          } else {
            return 1;
          }
        },
        true
      );
      var valuesDomainsVerticalGroups = [];
      connectedDomains.domains.sort(function(a, b) {
        return a.bounding.x - b.bounding.x;
      });
      connectedDomains.domains.forEach(function(domain) {
        if (domain.identifier === 1) {
          var overlapped = false;
          valuesDomainsVerticalGroups.forEach(function(group) {
            var bounding = domain.bounding;
            var left = bounding.x;
            var right = bounding.x + bounding.w;
            if (overlap(left, right, group.begin, group.end)) {
              overlapped = true;
              group.domains.push(domain);
              group.begin = group.begin > left ? left : group.begin;
              group.end = group.end < right ? right : group.end;
            }
          });
          if (!overlapped) {
            valuesDomainsVerticalGroups.push({
              begin: domain.bounding.x,
              end: domain.bounding.x + domain.bounding.w,
              domains: [domain]
            });
          }
        }
      });
      valuesDomainsVerticalGroups.forEach(function(group) {
        var title = null;
        var info = null;
        var overlapped = false;
        var minimunLeftDistance = null;
        var nearestLeftTitle = null;
        var distance = null;
        for (title in titleInfo) {
          info = titleInfo[title];
          if (group.begin > info.titleBegin) {
            distance = group.begin - info.titleBegin;
            if (!nearestLeftTitle || distance < minimunLeftDistance) {
              nearestLeftTitle = title;
              minimunLeftDistance = distance;
            }
          }
          if (overlap(group.begin, group.end, info.titleBegin, info.titleEnd)) {
            overlapped = true;
            info.titleBegin = info.titleBegin > group.begin ? group.begin : info.titleBegin;
            info.titleEnd = info.titleEnd < group.end ? group.end : info.titleEnd;
          }
        }
        if (!overlapped && nearestLeftTitle) {
          var nearestTitleField = titleInfo[nearestLeftTitle];
          nearestTitleField.titleBegin = nearestTitleField.titleBegin > group.begin ? group.begin : nearestTitleField.titleBegin;
          nearestTitleField.titleEnd = nearestTitleField.titleEnd < group.end ? group.end : nearestTitleField.titleEnd;
        }
      });
      var result = [];
      lines.forEach(function(line, index) {
        if (index > 0) {
          var lineItem = {};
          var title = null;
          var info = null;
          var value = null;
          for (title in titleInfo) {
            info = titleInfo[title];
            value = line.substring(info.titleBegin, info.titleEnd + 1);
            lineItem[title] = splitValue(value.trim());
          }
          result.push(lineItem);
        }
      });
      return result;
    };
    function overlap(begin1, end1, begin2, end2) {
      return begin1 > begin2 && begin1 < end2 || // 2--1--2--1 or 2--1--1--2
      end1 > begin2 && end1 < end2 || // 1--2--1--2 or 2--1--1--2
      begin1 <= begin2 && end1 >= end2;
    }
    function splitValue(value) {
      var match = value.match(/"/g);
      if (!match || match.length == 1) {
        return value.split(/\s+/);
      } else {
        var result = [];
        var chunk = null;
        var ifInWrappedChunk = false;
        var ifInPureWrappedChunk = false;
        var quotaCount = 0;
        var maxQuotaCount = match.length % 2 == 0 ? match.length : match.length - 1;
        var previousItem = null;
        var values = value.split("");
        values.forEach(function(item, index) {
          if (item !== " ") {
            if (item === '"') {
              if (ifInWrappedChunk === false && quotaCount <= maxQuotaCount) {
                ifInWrappedChunk = true;
                quotaCount++;
                if (previousItem === " " || previousItem === null) {
                  ifInPureWrappedChunk = true;
                  chunk = "";
                } else {
                  chunk += item;
                }
              } else if (ifInWrappedChunk === true) {
                ifInWrappedChunk = false;
                quotaCount++;
                if (ifInPureWrappedChunk === true) {
                  ifInPureWrappedChunk = false;
                  result.push(chunk);
                  chunk = null;
                } else {
                  chunk += item;
                }
              }
            } else if (ifInWrappedChunk === false && (previousItem === " " || previousItem === null)) {
              chunk = item;
            } else {
              chunk += item;
            }
          } else if (ifInWrappedChunk) {
            chunk += item;
          } else if (chunk !== null) {
            result.push(chunk);
            chunk = null;
          }
          previousItem = item;
          if (index == values.length - 1 && chunk !== null) {
            result.push(chunk);
            chunk = null;
          }
        });
        return result;
      }
    }
  }
});

// src/ps/index.js
init_cjs_shims();
var ChildProcess = require("child_process");
var IS_WIN = require_isWin();
var TableParser = require_table_parser();
var EOL = /(\r\n)|(\n\r)|\n|\r/;
var SystemEOL = require("os").EOL;
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
