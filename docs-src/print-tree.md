## Print Tree

Smart tree printer that auto-detects the input type. Prints a directory tree for folders and extracts a tarball tree for `.tgz` files.

### Aliases

- `print-tree` (default)

### Usage

```bash
print-tree [options] [path]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `path` | Path to file or directory (default: current directory) |

### Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help message |

### Description

`print-tree` inspects the given path and automatically determines the appropriate tree view:
- **Directories**: produces a structured tree with file SHA-256 hashes (delegates to `print-directory-tree`)
- **Binary/tarball files**: extracts and displays the directory tree from inside the `.tgz` archive (delegates to `print-tarball-tree`)

### Source

See [`src/print-tree-cli.mjs`](../src/print-tree-cli.mjs)
