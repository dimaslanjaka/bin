# Tarball Tree Printer

Prints the directory tree structure of a `.tgz` (gzipped tarball) archive to the console.

# Usage

```bash
print-tarball-tree [options]
```

### Aliases

- `print-tarball-tree` (default)
- `tarball-tree`

### Options

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Path to the tarball file |
| `-h, --help` | Show help message |

### Description

Reads a `.tgz` file (gzipped tar archive), extracts the entry names, and prints them as a hierarchical directory tree using Unicode box-drawing characters (`├──`, `└──`, `│`).

The file path can be given as an absolute path or a relative path (resolved against the current working directory).

If no `--file` argument is provided, the command exits with an error.

If the specified file does not exist, the command exits with an error.

### Examples

Print the tree of a tarball in the current directory:

```bash
print-tarball-tree --file package.tgz
```

Print the tree using an absolute path:

```bash
print-tarball-tree -f /path/to/package.tgz
```

Using the alias:

```bash
tarball-tree --file build/package.tgz
```

# Source

See [`src/print-tarball-tree.mjs`](../src/print-tarball-tree.mjs)
