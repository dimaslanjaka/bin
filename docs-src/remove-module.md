## Remove Module

Removes a module from one or more dependency directories (Node.js, PHP Composer, Python venv).

### Usage

```bash
remove-module <moduleName> [<moduleName> ...]
```

### Options

| Option | Description |
|--------|-------------|
| `--node` | Remove from `node_modules` (default if no flag given) |
| `--composer` | Remove from `vendor/composer` |
| `--venv` | Remove from `venv`/`.venv` site-packages |
| `-h, --help` | Show help message |

### Examples

```bash
remove-module lodash
remove-module lodash express --node
remove-module phpunit --composer
remove-module requests --venv
remove-module lodash phpunit --node --composer
```

### Source

See [`src/remove-module.mjs`](../src/remove-module.mjs)
