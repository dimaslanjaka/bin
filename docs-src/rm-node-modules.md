## Remove Node Modules (Fast)

Alternative tool for removing `node_modules` — faster for very large projects. Removes subfolders by first-letter in parallel.

### Aliases

- `rm-node-modules` (default)
- `rm-node-module`
- `remove-node-modules`
- `remove-node-module`

### Usage

```bash
rm-node-modules [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--force` | Actually delete (default is dry-run mode) |
| `-h, --help` | Show help message |

### Description

- Removes `node_modules` subfolders by first-letter in parallel (a-z, A-Z)
- Writes and executes a temporary shell script (auto-removed after completion)
- On Windows requires a Unix-compatible shell in `PATH` (e.g., Git Bash or WSL)

### Examples

```bash
npx binary-collections rm-node-modules
npx binary-collections rm-node-modules --force
yarn run rm-node-modules
```

### Source

See [`src/rm-node-module-cli.cjs`](../src/rm-node-module-cli.cjs) & [`src/rm-node-modules.cjs`](../src/rm-node-modules.cjs)
