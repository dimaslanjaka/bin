## Per-Branch Yarn Lock Installer

Manages per-branch `yarn.lock` files — saves and restores branch-specific lockfiles.

### Aliases

- `yarn-install` (default)
- `y-install`
- `yarn-per-branch-lock-installer`

### Usage

```bash
yarn-install [packages...]
```

### Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help message |

### Description

- Saves the current `yarn.lock` to a branch-specific file before switching branches
- Restores the branch-specific `yarn.lock` when returning to a branch
- Runs `yarn install` or `yarn up` to sync dependencies

### Source

See [`src/yarn-per-branch-lock-installer.cjs`](../src/yarn-per-branch-lock-installer.cjs)
