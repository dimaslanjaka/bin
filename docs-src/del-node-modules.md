## Node Modules Cleaner

Recursively finds and removes `node_modules` directories.

### Aliases

- `del-nodemodules` (default)
- `del-node-modules`

### Usage

```bash
del-nodemodules [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--force`, `-f` | Actually delete (default is dry-run mode) |
| `-c, --concurrent N` | Set concurrent removals (default: 2, or CPU count) |
| `-h, --help` | Show help message |

### Description

- Searches for all `node_modules` directories recursively
- Also removes `package-lock.json`, `yarn.lock`, and `.yarn/cache` directories
- By default runs in dry-run mode (shows what would be deleted)
- Pass `--force` to actually perform deletion

### Source

See [`src/del-node-modules.js`](../src/del-node-modules.js)
