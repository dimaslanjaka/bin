## PHP CS Fixer Staged

Runs `php-cs-fixer` on staged PHP files only.

### Usage

```bash
php-cs-fixer-staged
```

### Description

- Gets the list of staged PHP files using `git diff --name-only --cached --diff-filter=ACM`
- Automatically locates `php-cs-fixer` in PATH or common locations (`vendor/bin/`, `bin/`, `tools/`)
- Runs `php-cs-fixer fix` on only the staged PHP files

### Source

See [`src/php-cs-fixer-staged.cjs`](../src/php-cs-fixer-staged.cjs)
