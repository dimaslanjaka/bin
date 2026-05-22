## Changelog Generator

Generates a `CHANGELOG.md` file from git commit history, grouped by version bumps.

### Usage

```bash
changelog
```

### Description

- Analyzes git commit history looking for version bumps
- Groups commits by version
- Skips dependabot and irrelevant commits
- Outputs the original git log to `tmp/original.md` for reference

### Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help message |

### Source

See [`src/changelog.cjs`](../src/changelog.cjs)
