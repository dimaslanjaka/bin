## Submodule Install

Installs and updates git submodules recursively, applying access tokens for private repos.

### Usage

```bash
submodule-install [options] [repo-path]
```

### Options

| Option | Description |
|--------|-------------|
| `--cwd <path>` | Set working directory |
| `-h, --help` | Show help message |

### Description

- Installs and updates git submodules recursively
- Applies access tokens (`GITHUB_TOKEN` or `ACCESS_TOKEN` from `.env`) for private repositories
- Prevents infinite recursion loops by tracking visited submodules

### Environment Setup

1. Add `GITHUB_TOKEN` or `ACCESS_TOKEN` to your `.env` file
2. Ensure your tokens have access to the required repositories

### Source

See [`src/submodule-install.cjs`](../src/submodule-install.cjs)
