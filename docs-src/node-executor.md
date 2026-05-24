## Node Executor

Execute scripts in various languages by dispatching to the appropriate runtime based on file extension.

### Aliases

This command is available under several aliases (all invoke the same CLI):

- `node-exec` (default)
- `exec-node`
- `execute-node`
- `node-executor`

### Usage

```bash
node-exec [options] <file>
```

### Options

| Flag | Description |
| :--- | :--- |
| `-h`, `--help` | Show help |
| `--exit-code=<code>` | Exit code when file not found or invalid (default: `1`) |

### Supported Extensions

| Extension | Runtime |
| :-------- | :------ |
| `.php` | `php` |
| `.js` | `node` |
| `.mjs` | `node` |
| `.cjs` | `node` |
| `.py` | `python` |
| `.rb` | `ruby` |
| `.sh` | `bash` |
| `.bat` | `cmd` |

### Example

```bash
node-exec test.php
node-exec script.js
node-exec --exit-code=0 missing.php
```

### Source

See [`src/node-executor.cjs`](../src/node-executor.cjs)
