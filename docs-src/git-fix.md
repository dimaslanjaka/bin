## Git Fix Utility

A comprehensive configuration fixer for cross-platform development. Non-interactive and argument-driven.

### Usage

```bash
git-fix                        # Apply all default fixes
git-fix --lf-only              # Force LF line endings only
git-fix --permissions          # Ignore file permissions only
git-fix --normalize            # Normalize existing files only
git-fix --user                 # Configure Git user from env vars
git-fix --user NAME EMAIL      # Configure Git user with specific values
```

Options can be combined: `git-fix --lf-only --permissions`

### Features

- Forces LF line endings (`core.autocrlf = false`)
- Ignores file permission changes (`core.filemode = false`)
- Sets pull strategy to prevent auto-rebase
- Creates/updates `.gitattributes`
- Normalizes existing line endings

### User Configuration

- Uses environment variables: `GITHUB_USER`, `GITHUB_EMAIL` (if no args provided)
- Use `--user NAME EMAIL` to specify credentials directly
- Precedence: CLI arguments > environment variables > skip

### Source

See [`src/git/git-fix.cjs`](../src/git/git-fix.cjs) & submodules in [`src/git/`](../src/git/)
