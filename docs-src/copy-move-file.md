## Copy & Move File

Copies or moves files/directories via CLI.

### Usage

```bash
copy <src> <dest>
move <src> <dest>
```

### Aliases

The copy command is available under several aliases (all invoke the same CLI):

- `copy` (default)
- `node-copy`
- `copy-file`

The move command is available under several aliases (all invoke the same CLI):

- `move` (default)
- `node-move`
- `move-file`

### Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help message |

### Examples

```bash
copy file.txt backup/file.txt
copy ./src ./dist
move file.txt backup/file.txt
move ./src ./dist
```

### Source

See [`src/file/copy-cli.mjs`](../src/file/copy-cli.mjs) & [`src/file/copy.mjs`](../src/file/copy.mjs)
and [`src/file/move-cli.mjs`](../src/file/move-cli.mjs) & [`src/file/move.mjs`](../src/file/move.mjs)
