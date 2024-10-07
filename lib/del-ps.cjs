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

// node_modules/cross-spawn/dist/lib/enoent.js
var require_enoent = __commonJS({
  "node_modules/cross-spawn/dist/lib/enoent.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var isWin2 = process.platform === "win32";
    function notFoundError(original, syscall) {
      return Object.assign(new Error("".concat(syscall, " ").concat(original.command, " ENOENT")), {
        code: "ENOENT",
        errno: "ENOENT",
        syscall: "".concat(syscall, " ").concat(original.command),
        path: original.command,
        spawnargs: original.args
      });
    }
    function hookChildProcess(cp, parsed) {
      if (!isWin2) {
        return;
      }
      var originalEmit = cp.emit;
      cp.emit = function(name, arg1) {
        if (name === "exit") {
          var err = verifyENOENT(arg1, parsed, "spawn");
          if (err) {
            return originalEmit.call(cp, "error", err);
          }
        }
        return originalEmit.apply(cp, arguments);
      };
    }
    function verifyENOENT(status, parsed) {
      if (isWin2 && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, "spawn");
      }
      return null;
    }
    function verifyENOENTSync(status, parsed) {
      if (isWin2 && status === 1 && !parsed.file) {
        return notFoundError(parsed.original, "spawnSync");
      }
      return null;
    }
    module2.exports = {
      hookChildProcess,
      verifyENOENT,
      verifyENOENTSync,
      notFoundError
    };
  }
});

// node_modules/isexe/windows.js
var require_windows = __commonJS({
  "node_modules/isexe/windows.js"(exports2, module2) {
    init_cjs_shims();
    module2.exports = isexe;
    isexe.sync = sync;
    var fs = require("fs");
    function checkPathExt(path, options) {
      var pathext = options.pathExt !== void 0 ? options.pathExt : process.env.PATHEXT;
      if (!pathext) {
        return true;
      }
      pathext = pathext.split(";");
      if (pathext.indexOf("") !== -1) {
        return true;
      }
      for (var i = 0; i < pathext.length; i++) {
        var p = pathext[i].toLowerCase();
        if (p && path.substr(-p.length).toLowerCase() === p) {
          return true;
        }
      }
      return false;
    }
    function checkStat(stat, path, options) {
      if (!stat.isSymbolicLink() && !stat.isFile()) {
        return false;
      }
      return checkPathExt(path, options);
    }
    function isexe(path, options, cb) {
      fs.stat(path, function(er, stat) {
        cb(er, er ? false : checkStat(stat, path, options));
      });
    }
    function sync(path, options) {
      return checkStat(fs.statSync(path), path, options);
    }
  }
});

// node_modules/isexe/mode.js
var require_mode = __commonJS({
  "node_modules/isexe/mode.js"(exports2, module2) {
    init_cjs_shims();
    module2.exports = isexe;
    isexe.sync = sync;
    var fs = require("fs");
    function isexe(path, options, cb) {
      fs.stat(path, function(er, stat) {
        cb(er, er ? false : checkStat(stat, options));
      });
    }
    function sync(path, options) {
      return checkStat(fs.statSync(path), options);
    }
    function checkStat(stat, options) {
      return stat.isFile() && checkMode(stat, options);
    }
    function checkMode(stat, options) {
      var mod = stat.mode;
      var uid = stat.uid;
      var gid = stat.gid;
      var myUid = options.uid !== void 0 ? options.uid : process.getuid && process.getuid();
      var myGid = options.gid !== void 0 ? options.gid : process.getgid && process.getgid();
      var u = parseInt("100", 8);
      var g = parseInt("010", 8);
      var o = parseInt("001", 8);
      var ug = u | g;
      var ret = mod & o || mod & g && gid === myGid || mod & u && uid === myUid || mod & ug && myUid === 0;
      return ret;
    }
  }
});

// node_modules/isexe/index.js
var require_isexe = __commonJS({
  "node_modules/isexe/index.js"(exports2, module2) {
    init_cjs_shims();
    var fs = require("fs");
    var core;
    if (process.platform === "win32" || global.TESTING_WINDOWS) {
      core = require_windows();
    } else {
      core = require_mode();
    }
    module2.exports = isexe;
    isexe.sync = sync;
    function isexe(path, options, cb) {
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      if (!cb) {
        if (typeof Promise !== "function") {
          throw new TypeError("callback not provided");
        }
        return new Promise(function(resolve, reject) {
          isexe(path, options || {}, function(er, is) {
            if (er) {
              reject(er);
            } else {
              resolve(is);
            }
          });
        });
      }
      core(path, options || {}, function(er, is) {
        if (er) {
          if (er.code === "EACCES" || options && options.ignoreErrors) {
            er = null;
            is = false;
          }
        }
        cb(er, is);
      });
    }
    function sync(path, options) {
      try {
        return core.sync(path, options || {});
      } catch (er) {
        if (options && options.ignoreErrors || er.code === "EACCES") {
          return false;
        } else {
          throw er;
        }
      }
    }
  }
});

// node_modules/cross-spawn/node_modules/which/lib/index.js
var require_lib = __commonJS({
  "node_modules/cross-spawn/node_modules/which/lib/index.js"(exports2, module2) {
    init_cjs_shims();
    var isexe = require_isexe();
    var { join, delimiter, sep, posix } = require("path");
    var isWindows = process.platform === "win32";
    var rSlash = new RegExp(`[${posix.sep}${sep === posix.sep ? "" : sep}]`.replace(/(\\)/g, "\\$1"));
    var rRel = new RegExp(`^\\.${rSlash.source}`);
    var getNotFoundError = (cmd) => Object.assign(new Error(`not found: ${cmd}`), { code: "ENOENT" });
    var getPathInfo = (cmd, {
      path: optPath = process.env.PATH,
      pathExt: optPathExt = process.env.PATHEXT,
      delimiter: optDelimiter = delimiter
    }) => {
      const pathEnv = cmd.match(rSlash) ? [""] : [
        // windows always checks the cwd first
        ...isWindows ? [process.cwd()] : [],
        ...(optPath || /* istanbul ignore next: very unusual */
        "").split(optDelimiter)
      ];
      if (isWindows) {
        const pathExtExe = optPathExt || [".EXE", ".CMD", ".BAT", ".COM"].join(optDelimiter);
        const pathExt = pathExtExe.split(optDelimiter).reduce((acc, item) => {
          acc.push(item);
          acc.push(item.toLowerCase());
          return acc;
        }, []);
        if (cmd.includes(".") && pathExt[0] !== "") {
          pathExt.unshift("");
        }
        return { pathEnv, pathExt, pathExtExe };
      }
      return { pathEnv, pathExt: [""] };
    };
    var getPathPart = (raw, cmd) => {
      const pathPart = /^".*"$/.test(raw) ? raw.slice(1, -1) : raw;
      const prefix = !pathPart && rRel.test(cmd) ? cmd.slice(0, 2) : "";
      return prefix + join(pathPart, cmd);
    };
    var which = async (cmd, opt = {}) => {
      const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
      const found = [];
      for (const envPart of pathEnv) {
        const p = getPathPart(envPart, cmd);
        for (const ext of pathExt) {
          const withExt = p + ext;
          const is = await isexe(withExt, { pathExt: pathExtExe, ignoreErrors: true });
          if (is) {
            if (!opt.all) {
              return withExt;
            }
            found.push(withExt);
          }
        }
      }
      if (opt.all && found.length) {
        return found;
      }
      if (opt.nothrow) {
        return null;
      }
      throw getNotFoundError(cmd);
    };
    var whichSync = (cmd, opt = {}) => {
      const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
      const found = [];
      for (const pathEnvPart of pathEnv) {
        const p = getPathPart(pathEnvPart, cmd);
        for (const ext of pathExt) {
          const withExt = p + ext;
          const is = isexe.sync(withExt, { pathExt: pathExtExe, ignoreErrors: true });
          if (is) {
            if (!opt.all) {
              return withExt;
            }
            found.push(withExt);
          }
        }
      }
      if (opt.all && found.length) {
        return found;
      }
      if (opt.nothrow) {
        return null;
      }
      throw getNotFoundError(cmd);
    };
    module2.exports = which;
    which.sync = whichSync;
  }
});

// node_modules/cross-spawn/dist/lib/util/pathKey.js
var require_pathKey = __commonJS({
  "node_modules/cross-spawn/dist/lib/util/pathKey.js"(exports2, module2) {
    init_cjs_shims();
    function pathKey(options) {
      if (options === void 0) {
        options = {};
      }
      var _a = options.env, env = _a === void 0 ? process.env : _a, _b = options.platform, platform = _b === void 0 ? process.platform : _b;
      if (platform !== "win32") {
        return "PATH";
      }
      return Object.keys(env).reverse().find(function(key) {
        return key.toUpperCase() === "PATH";
      }) || "Path";
    }
    module2.exports = pathKey;
  }
});

// node_modules/cross-spawn/dist/lib/util/resolveCommand.js
var require_resolveCommand = __commonJS({
  "node_modules/cross-spawn/dist/lib/util/resolveCommand.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var path = require("path");
    var which = require_lib();
    var getPathKey = require_pathKey();
    function resolveCommandAttempt(parsed, withoutPathExt) {
      var env = parsed.options.env || process.env;
      var cwd = process.cwd();
      var hasCustomCwd = parsed.options.cwd != null;
      var shouldSwitchCwd = hasCustomCwd && process.chdir !== void 0 && !process.chdir.disabled;
      if (shouldSwitchCwd) {
        try {
          process.chdir(parsed.options.cwd);
        } catch (err) {
        }
      }
      var resolved;
      try {
        resolved = which.sync(parsed.command, {
          path: env[getPathKey({ env })],
          pathExt: withoutPathExt ? path.delimiter : void 0
        });
      } catch (e) {
      } finally {
        if (shouldSwitchCwd) {
          process.chdir(cwd);
        }
      }
      if (resolved) {
        resolved = path.resolve(hasCustomCwd ? parsed.options.cwd : "", resolved);
      }
      return resolved;
    }
    function resolveCommand(parsed) {
      return resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);
    }
    module2.exports = resolveCommand;
  }
});

// node_modules/cross-spawn/dist/lib/util/escape.js
var require_escape = __commonJS({
  "node_modules/cross-spawn/dist/lib/util/escape.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;
    function escapeCommand(arg) {
      arg = arg.replace(metaCharsRegExp, "^$1");
      return arg;
    }
    function escapeArgument(arg, doubleEscapeMetaChars) {
      arg = "".concat(arg);
      arg = arg.replace(/(\\*)"/g, '$1$1\\"');
      arg = arg.replace(/(\\*)$/, "$1$1");
      arg = '"'.concat(arg, '"');
      arg = arg.replace(metaCharsRegExp, "^$1");
      if (doubleEscapeMetaChars) {
        arg = arg.replace(metaCharsRegExp, "^$1");
      }
      return arg;
    }
    module2.exports.command = escapeCommand;
    module2.exports.argument = escapeArgument;
  }
});

// node_modules/shebang-regex/index.js
var require_shebang_regex = __commonJS({
  "node_modules/shebang-regex/index.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    module2.exports = /^#!(.*)/;
  }
});

// node_modules/shebang-command/index.js
var require_shebang_command = __commonJS({
  "node_modules/shebang-command/index.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var shebangRegex = require_shebang_regex();
    module2.exports = (string = "") => {
      const match = string.match(shebangRegex);
      if (!match) {
        return null;
      }
      const [path, argument] = match[0].replace(/#! ?/, "").split(" ");
      const binary = path.split("/").pop();
      if (binary === "env") {
        return argument;
      }
      return argument ? `${binary} ${argument}` : binary;
    };
  }
});

// node_modules/cross-spawn/dist/lib/util/readShebang.js
var require_readShebang = __commonJS({
  "node_modules/cross-spawn/dist/lib/util/readShebang.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var fs = require("fs");
    var shebangCommand = require_shebang_command();
    function readShebang(command) {
      var size = 150;
      var buffer = Buffer.alloc(size);
      var fd;
      try {
        fd = fs.openSync(command, "r");
        fs.readSync(fd, buffer, 0, size, 0);
        fs.closeSync(fd);
      } catch (e) {
      }
      return shebangCommand(buffer.toString());
    }
    module2.exports = readShebang;
  }
});

// node_modules/cross-spawn/dist/lib/parse.js
var require_parse = __commonJS({
  "node_modules/cross-spawn/dist/lib/parse.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var path = require("path");
    var resolveCommand = require_resolveCommand();
    var escape = require_escape();
    var readShebang = require_readShebang();
    var isWin2 = process.platform === "win32";
    var isExecutableRegExp = /\.(?:com|exe)$/i;
    var isCmdShimRegExp = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
    function detectShebang(parsed) {
      parsed.file = resolveCommand(parsed);
      var shebang = parsed.file && readShebang(parsed.file);
      if (shebang) {
        parsed.args.unshift(parsed.file);
        parsed.command = shebang;
        return resolveCommand(parsed);
      }
      return parsed.file;
    }
    function parseNonShell(parsed) {
      if (!isWin2) {
        return parsed;
      }
      var commandFile = detectShebang(parsed);
      var needsShell = !isExecutableRegExp.test(commandFile);
      if (parsed.options.forceShell || needsShell) {
        var needsDoubleEscapeMetaChars_1 = isCmdShimRegExp.test(commandFile);
        parsed.command = path.normalize(parsed.command);
        parsed.command = escape.command(parsed.command);
        parsed.args = parsed.args.map(function(arg) {
          return escape.argument(arg, needsDoubleEscapeMetaChars_1);
        });
        var shellCommand = [parsed.command].concat(parsed.args).join(" ");
        parsed.args = ["/d", "/s", "/c", '"'.concat(shellCommand, '"')];
        parsed.command = process.env.comspec || "cmd.exe";
        parsed.options.windowsVerbatimArguments = true;
      }
      return parsed;
    }
    function parse(command, args, options) {
      if (args && !Array.isArray(args)) {
        options = args;
        args = null;
      }
      args = args ? args.slice(0) : [];
      options = Object.assign({}, options);
      var parsed = {
        command,
        args,
        options,
        file: void 0,
        original: {
          command,
          args
        }
      };
      return options.shell ? parsed : parseNonShell(parsed);
    }
    module2.exports = parse;
  }
});

// node_modules/cross-spawn/dist/spawn.js
var require_spawn = __commonJS({
  "node_modules/cross-spawn/dist/spawn.js"(exports2) {
    "use strict";
    init_cjs_shims();
    var __spreadArray = exports2 && exports2.__spreadArray || function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.sync = exports2.async = exports2._parse = exports2._enoent = exports2.spawnAsync = exports2.spawnSync = exports2.spawn = void 0;
    var child_process_1 = __importDefault(require("child_process"));
    var enoent_1 = __importDefault(require_enoent());
    var parse_1 = __importDefault(require_parse());
    function spawn(command, args, options) {
      var parsed = (0, parse_1.default)(command, args, options);
      var spawned = child_process_1.default.spawn(parsed.command, parsed.args, parsed.options);
      enoent_1.default.hookChildProcess(spawned, parsed);
      return spawned;
    }
    exports2.spawn = spawn;
    function spawnSync(command, args, options) {
      var parsed = (0, parse_1.default)(command, args, options);
      var result = child_process_1.default.spawnSync(parsed.command, parsed.args, parsed.options);
      result.error = result.error || enoent_1.default.verifyENOENTSync(result.status, parsed);
      return result;
    }
    exports2.spawnSync = spawnSync;
    function spawnAsync(command, args, options) {
      return new Promise(function(resolve) {
        var stdout = "";
        var stderr = "";
        var child = spawn(command, args, options);
        if (child.stdout && "on" in child.stdout) {
          child.stdout.setEncoding("utf8");
          child.stdout.on("data", function(data) {
            stdout += data;
          });
        }
        if (child.stderr && "on" in child.stdout) {
          child.stderr.setEncoding("utf8");
          child.stderr.on("data", function(data) {
            stderr += data;
          });
        }
        child.on("close", function(code, signal) {
          resolve({
            stdout,
            stderr,
            error: code !== 0 ? __spreadArray(__spreadArray([command], args, true), ["dies with code", code, "signal", signal], false).join(" ") : null,
            output: "".concat(stdout, "\n\n").concat(stderr)
          });
        });
      });
    }
    exports2.spawnAsync = spawnAsync;
    exports2._enoent = enoent_1.default;
    exports2._parse = parse_1.default;
    exports2.async = spawnAsync;
    exports2.sync = spawnSync;
  }
});

// node_modules/cross-spawn/dist/index.js
var require_dist = __commonJS({
  "node_modules/cross-spawn/dist/index.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2._enoent = exports2._parse = exports2.spawnAsync = exports2.spawnSync = exports2.async = exports2.sync = exports2.spawn = void 0;
    var internalSpawn = __importStar(require_spawn());
    if (typeof module2 !== "undefined" && "exports" in module2) {
      module2.exports = internalSpawn.spawn;
      module2.exports.spawn = internalSpawn.spawn;
      module2.exports.sync = internalSpawn.spawnSync;
      module2.exports.async = internalSpawn.spawnAsync;
      module2.exports.spawnSync = internalSpawn.spawnSync;
      module2.exports.spawnAsync = internalSpawn.spawnAsync;
      module2.exports._parse = internalSpawn._parse;
      module2.exports._enoent = internalSpawn._enoent;
    }
    __exportStar(require_spawn(), exports2);
    exports2.spawn = internalSpawn.spawn;
    exports2.sync = internalSpawn.spawnSync;
    exports2.async = internalSpawn.spawnAsync;
    exports2.spawnSync = internalSpawn.spawnSync;
    exports2.spawnAsync = internalSpawn.spawnAsync;
    exports2._parse = internalSpawn._parse;
    exports2._enoent = internalSpawn._enoent;
    exports2.default = internalSpawn;
  }
});

// src/ps/isWin.js
var require_isWin = __commonJS({
  "src/ps/isWin.js"(exports2, module2) {
    init_cjs_shims();
    var isWin2 = process.platform === "win32";
    module2.exports = isWin2;
  }
});

// src/utils.js
var require_utils = __commonJS({
  "src/utils.js"(exports2, module2) {
    init_cjs_shims();
    var { fs, path } = require("sbg-utility");
    var argv = require("minimist")(process.argv.slice(2));
    function getArgs() {
      return argv;
    }
    function delStream(globStream) {
      globStream.stream().on("data", (result) => {
        const fullPath = path.resolve(process.cwd(), result);
        if (fs.statSync(fullPath).isDirectory()) {
          const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
          for (let i = 0; i < subdir.length; i++) {
            del(subdir[i]);
          }
        }
        del(fullPath);
      });
    }
    function del(fullPath) {
      if (fs.statSync(fullPath).isDirectory()) {
        const subdir = fs.readdirSync(fullPath).map((dirPath) => path.resolve(fullPath, dirPath));
        for (let i = 0; i < subdir.length; i++) {
          del(subdir[i]);
        }
      } else {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true, retryDelay: 7e3 });
          console.log("deleted", fullPath);
        } catch (_) {
          console.log("failed delete", fullPath);
        }
      }
    }
    var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    module2.exports = { del, delStream, getArgs, delay };
  }
});

// src/del-ps.js
init_cjs_shims();
var crossSpawn = require_dist();
var ps = require("ps-node");
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
      resultList.forEach(function(process2) {
        if (process2) {
          if (!isWin) {
            crossSpawn.spawnAsync("kill", ["-9", process2.pid]).catch((e) => console.log(`kill failed ${e.message}`));
            crossSpawn.spawnAsync("killall", ["-9", process2.pid]).catch((e) => console.log(`killall failed ${e.message}`));
          } else {
            crossSpawn.spawnAsync("wmic", ["process", "where", `"name like '${command}'" delete`]).catch((e) => console.log(`wmic failed ${e.message}`));
          }
        }
      });
    }
  );
});
