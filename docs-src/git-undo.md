## Git Undo Commands

Utilities to undo recent git operations while preserving your changes.

### Available Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `undo-commit` | `undo-last-commit`, `git-undo-commit` | Soft-resets the last commit (`git reset --soft HEAD~1`) |
| `undo-staged` | `git-undo-staged` | Unstages all staged changes (`git reset HEAD .`) |

### Usage

```bash
undo-commit    # Undo the last commit, keep changes staged
undo-staged    # Unstage all staged changes
```

### Source

See [`src/git/undo-commit.cjs`](../src/git/undo-commit.cjs), [`src/git/undo-staged.cjs`](../src/git/undo-staged.cjs)
