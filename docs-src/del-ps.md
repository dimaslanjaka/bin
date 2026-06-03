## Process Management

Terminate processes quickly by name or type across platforms.

### Commands

| Command | Description |
|---------|-------------|
| `del-ps <process-name>` | Kill processes by command name (cross-platform) |
| `kill-process <name>` | Kill process by name (Unix `killall`) |
| `nodekill` | Kill all Node.js processes |
| `javakill` | Kill all Java processes (Windows `taskkill`) |

### Usage

```bash
# Kill processes by name
del-ps <process-name>

# Kill specific types
kill-process <name>    # Unix: uses killall
nodekill               # Kill all node.exe processes
javakill               # Kill all java.exe processes (Windows)
```

### Source

See [`src/del-ps-cli.mjs`](../src/del-ps-cli.mjs) and shell wrappers in [`bin/`](../bin/).
