#!/usr/bin/env python3
import os
import sys
import shlex
import subprocess
from pathlib import Path
from typing import List, Optional

_SCRIPT = str(Path(__file__).resolve())


def _help_text() -> str:
    """Build help text with dynamic script name."""
    return f"""\
Generic runner wrapper for Node.js, PHP, Python, Ruby, Go, Deno, Lua, Shell, and Perl scripts.

Usage:
  python {_SCRIPT} [runner-options] <file> [forwarded-args...]

Examples:
  python {_SCRIPT} folder/script.php --cli-php-script=anyValue
  python {_SCRIPT} folder/script.js --name=test
  python {_SCRIPT} folder/script.py --foo bar
  python {_SCRIPT} folder/script.rb --verbose
  python {_SCRIPT} folder/script.go --help
  python {_SCRIPT} folder/script.ts --debug
  python {_SCRIPT} folder/script.sh --dry-run
  python {_SCRIPT} folder/script.pl --foo

Keep new CMD open:
  python {_SCRIPT} -k folder/script.php --cli-php-script=anyValue

Run in same terminal:
  python {_SCRIPT} -s folder/script.js --debug

Select runtime or override binary:
  python {_SCRIPT} -l node folder/script.js --foo=bar
  python {_SCRIPT} -l ruby folder/script.rb --foo=bar
  python {_SCRIPT} -l go folder/script.go --foo=bar

Select runtime and override binary:
  python {_SCRIPT} -l node=/usr/bin/node folder/script.js
  python {_SCRIPT} -l ruby=C:\\Ruby\\bin\\ruby.exe folder/script.rb
  python {_SCRIPT} --lang go=/usr/local/go/bin/go folder/script.go

Runner options:
  -k, --keep-open          Use cmd /k, keep CMD open after script exits
  --cmd-mode c|k           Use cmd /c or cmd /k
  -s, --same-terminal      Run in current terminal instead of opening new CMD
  -l, --lang KEY[=PATH]    Runtime: auto, node, php, python, ruby, go, deno, lua, sh, perl.
                            With =PATH also overrides the binary for that runtime.
  --cwd DIR                Working directory
  --dry-run                Print command without running
  -h, --help               Show this help

Important:
  Only options before <file> are parsed as runner options.
  Everything after <file> is forwarded untouched to the target script.
"""


NODE_EXTENSIONS = {".js", ".mjs", ".cjs"}
PHP_EXTENSIONS = {".php"}
PYTHON_EXTENSIONS = {".py"}
RUBY_EXTENSIONS = {".rb"}
GO_EXTENSIONS = {".go"}
DENO_EXTENSIONS = {".ts", ".tsx"}
LUA_EXTENSIONS = {".lua"}
SHELL_EXTENSIONS = {".sh", ".bash"}
PERL_EXTENSIONS = {".pl", ".pm"}

_VALID_RUNTIMES = {"auto", "node", "php", "python", "ruby", "go", "deno", "lua", "sh", "perl"}

# Maps runtime name → RunnerArgs attribute for its binary path
_RUNTIME_BIN_ATTR = {
    "node": "node_bin",
    "php": "php_bin",
    "python": "python_bin",
    "ruby": "ruby_bin",
    "go": "go_bin",
    "deno": "deno_bin",
    "lua": "lua_bin",
    "sh": "sh_bin",
    "perl": "perl_bin",
}


class RunnerArgs:
    def __init__(self) -> None:
        self.runtime = "auto"
        self.target_file: Optional[str] = None
        self.forwarded_args: List[str] = []

        self.node_bin = os.environ.get("NODE_BIN", "node")
        self.php_bin = os.environ.get("PHP_BIN", "php")
        self.python_bin = os.environ.get("PYTHON_BIN", sys.executable)
        self.ruby_bin = os.environ.get("RUBY_BIN", "ruby")
        self.go_bin = os.environ.get("GO_BIN", "go")
        self.deno_bin = os.environ.get("DENO_BIN", "deno")
        self.lua_bin = os.environ.get("LUA_BIN", "lua")
        self.sh_bin = os.environ.get("SH_BIN", "bash")
        self.perl_bin = os.environ.get("PERL_BIN", "perl")

        self.same_terminal = False
        self.keep_open = False
        self.cmd_mode = "c"
        self.cwd: Optional[str] = None
        self.dry_run = False


def print_error(message: str) -> None:
    print(f"❌ {message}")


def parse_args(argv: List[str]) -> RunnerArgs:
    parsed = RunnerArgs()

    if not argv:
        print(_help_text())
        sys.exit(0)

    i = 0

    while i < len(argv):
        arg = argv[i]

        if arg == "--":
            i += 1

            if i >= len(argv):
                print_error("Missing target file after --")
                sys.exit(1)

            parsed.target_file = argv[i]
            parsed.forwarded_args = argv[i + 1 :]
            return parsed

        if arg in ("-h", "--help"):
            print(_help_text())
            sys.exit(0)

        if arg in ("-k", "--keep-open"):
            parsed.keep_open = True
            parsed.cmd_mode = "k"
            i += 1
            continue

        if arg in ("-s", "--same-terminal"):
            parsed.same_terminal = True
            i += 1
            continue

        if arg == "--dry-run":
            parsed.dry_run = True
            i += 1
            continue

        if arg == "--cmd-mode":
            i += 1

            if i >= len(argv):
                print_error("Missing value for --cmd-mode. Use c or k.")
                sys.exit(1)

            mode = argv[i].lower()

            if mode not in {"c", "k"}:
                print_error("Invalid --cmd-mode. Use c or k.")
                sys.exit(1)

            parsed.cmd_mode = mode
            parsed.keep_open = mode == "k"
            i += 1
            continue

        if arg.startswith("--cmd-mode="):
            mode = arg.split("=", 1)[1].lower()

            if mode not in {"c", "k"}:
                print_error("Invalid --cmd-mode. Use c or k.")
                sys.exit(1)

            parsed.cmd_mode = mode
            parsed.keep_open = mode == "k"
            i += 1
            continue

        # -l/--lang <runtime>[=<path>]  —  select runtime and optionally override binary
        if arg in ("-l", "--lang"):
            i += 1

            if i >= len(argv):
                print_error("Missing value for --lang")
                sys.exit(1)

            lang_val = argv[i]

            if "=" in lang_val:
                # -l ruby=/path  →  select runtime + override binary
                runtime, path = lang_val.split("=", 1)
                runtime = normalize_runtime(runtime.strip())

                if runtime not in _RUNTIME_BIN_ATTR:
                    valid = ", ".join(sorted(_RUNTIME_BIN_ATTR))
                    print_error(f"Unknown runtime '{runtime}'. Valid: {valid}")
                    sys.exit(1)

                setattr(parsed, _RUNTIME_BIN_ATTR[runtime], path)
                parsed.runtime = runtime
            else:
                # -l ruby  →  just select runtime
                runtime = normalize_runtime(lang_val)

                if runtime not in _VALID_RUNTIMES:
                    valid = ", ".join(sorted(_VALID_RUNTIMES))
                    print_error(f"Unknown runtime '{runtime}'. Valid: {valid}")
                    sys.exit(1)

                parsed.runtime = runtime

            i += 1
            continue

        if arg == "--cwd":
            i += 1

            if i >= len(argv):
                print_error("Missing value for --cwd")
                sys.exit(1)

            parsed.cwd = argv[i]
            i += 1
            continue

        if arg.startswith("--cwd="):
            parsed.cwd = arg.split("=", 1)[1]
            i += 1
            continue

        # First non-runner argument is the target file.
        parsed.target_file = arg
        parsed.forwarded_args = argv[i + 1 :]
        return parsed

    print_error("Missing target file.")
    print()
    print(_help_text())
    sys.exit(1)


def normalize_runtime(runtime: str) -> str:
    runtime = runtime.strip().lower()

    aliases = {
        "js": "node",
        "nodejs": "node",
        "py": "python",
        "python3": "python",
        "rb": "ruby",
        "pl": "perl",
        "ts": "deno",
        "deno": "deno",
        "bash": "sh",
        "shell": "sh",
    }

    return aliases.get(runtime, runtime)


def resolve_path(value: str) -> str:
    return str(Path(value).expanduser().resolve())


def detect_runtime(target_file: str) -> str:
    ext = Path(target_file).suffix.lower()

    if ext in NODE_EXTENSIONS:
        return "node"

    if ext in PHP_EXTENSIONS:
        return "php"

    if ext in PYTHON_EXTENSIONS:
        return "python"

    if ext in RUBY_EXTENSIONS:
        return "ruby"

    if ext in GO_EXTENSIONS:
        return "go"

    if ext in DENO_EXTENSIONS:
        return "deno"

    if ext in LUA_EXTENSIONS:
        return "lua"

    if ext in SHELL_EXTENSIONS:
        return "sh"

    if ext in PERL_EXTENSIONS:
        return "perl"

    valid_exts = (
        ".js, .mjs, .cjs, .php, .py, .rb, .go, .ts, .tsx, .lua, .sh, .bash, .pl, .pm"
    )
    print_error(f"Cannot auto-detect runtime from extension: {ext or '(no extension)'}")
    print(f"Use --lang to specify. Supported extensions: {valid_exts}")
    sys.exit(1)


def build_command(parsed: RunnerArgs, target_file: str) -> List[str]:
    runtime = parsed.runtime

    if runtime == "auto":
        runtime = detect_runtime(target_file)

    if runtime == "node":
        return [parsed.node_bin, target_file] + parsed.forwarded_args

    if runtime == "php":
        return [parsed.php_bin, target_file] + parsed.forwarded_args

    if runtime == "python":
        return [parsed.python_bin, target_file] + parsed.forwarded_args

    if runtime == "ruby":
        return [parsed.ruby_bin, target_file] + parsed.forwarded_args

    if runtime == "go":
        return [parsed.go_bin, "run", target_file] + parsed.forwarded_args

    if runtime == "deno":
        return [parsed.deno_bin, "run", target_file] + parsed.forwarded_args

    if runtime == "lua":
        return [parsed.lua_bin, target_file] + parsed.forwarded_args

    if runtime == "sh":
        return [parsed.sh_bin, target_file] + parsed.forwarded_args

    if runtime == "perl":
        return [parsed.perl_bin, target_file] + parsed.forwarded_args

    print_error(f"Unsupported runtime: {runtime}")
    sys.exit(1)


def command_to_string(cmd: List[str]) -> str:
    if os.name == "nt":
        return subprocess.list2cmdline(cmd)

    return shlex.join(cmd)


def run(parsed: RunnerArgs) -> int:
    if not parsed.target_file:
        print_error("Missing target file.")
        return 1

    target_file = resolve_path(parsed.target_file)

    if not os.path.isfile(target_file):
        print_error(f"Target file not found: {target_file}")
        return 1

    cwd = resolve_path(parsed.cwd) if parsed.cwd else os.getcwd()

    if not os.path.isdir(cwd):
        print_error(f"Working directory not found: {cwd}")
        return 1

    command = build_command(parsed, target_file)

    print("[RUNNER] CWD:", cwd)
    print("[RUNNER] CMD:", command_to_string(command))

    if parsed.dry_run:
        return 0

    if parsed.same_terminal:
        code = subprocess.call(command, cwd=cwd)

        if parsed.keep_open:
            input("\nPress Enter to exit...")

        return code

    if os.name == "nt":
        cmd_switch = f"/{parsed.cmd_mode}"

        subprocess.Popen(
            ["cmd", cmd_switch] + command,
            cwd=cwd,
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )

        return 0

    subprocess.Popen(command, cwd=cwd)
    return 0


def main() -> None:
    parsed = parse_args(sys.argv[1:])
    code = run(parsed)
    sys.exit(code)


if __name__ == "__main__":
    main()
