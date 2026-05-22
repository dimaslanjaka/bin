## Directory Tree Printer

Generates a directory tree structure with file SHA-256 hashes.

### Aliases

- `print-tree` (default)
- `dir-tree`
- `print-directory-tree`

### Usage

```bash
print-tree [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Output file (default: `tmp/directory-structure.txt`) |
| `--ext <exts>` | Comma-separated list of file extensions to include |
| `--pattern <glob>` | Glob pattern to include (repeatable) |
| `--exclude <dirs>` | Directories to exclude |
| `--override-exclude, -we` | Override default excludes |
| `--git-add` | Stage output file to git |
| `-h, --help` | Show help message |

### Description

Scans the current directory recursively, generates a structured tree with SHA-256 hashes for each file, and writes the result to an output file.

### Source

See [`src/print-directory-tree.cjs`](../src/print-directory-tree.cjs)
