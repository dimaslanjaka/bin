## Git Diff Utility

Enhanced diff functionality for repository inspection. Saves diffs to temp files and optionally generates conventional commit prompts.

### Usage

```bash
git-diff [options] [file]
```

### Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help message |
| `-s, -S, --staged-only` | Show all staged diffs |
| `-u, --unstaged <file>` | Show unstaged diff for a specific file |
| `-u, --unstaged` | Show all unstaged diffs |
| `--ai` | Generate commit message with ChatGPT |

### Examples

```bash
git-diff FILE              # Show staged diff of a file
git-diff --staged-only     # Show all staged diffs
git-diff --unstaged FILE   # Show unstaged diff of a file
git-diff --unstaged        # Show all unstaged diffs
git-diff --ai              # Generate commit message with ChatGPT
```

### Source

See [`src/git/git-diff-cli.js`](../src/git/git-diff-cli.js).
