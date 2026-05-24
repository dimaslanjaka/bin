## Node Cache Cleaner

Cleans NPM, Yarn, and NPX caches in parallel.

### Usage

```bash
node-cache-cleaner [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help message |

### Description

- Runs `npm cache clean --force` to clean the NPM cache
- Runs `yarn cache clean` (or `yarn cache clean --all` for Yarn Berry) to clean the Yarn cache
- Removes `_npx`, `_cacache`, and `.cache/npx` directories to clean the NPX cache
- All cache cleaning operations run in parallel via `Promise.allSettled`
- Exits with code 0 on success, or 1 if any cache clean operation fails

### Source

See [`src/node-cache-cleaner-cli.ts`](../src/node-cache-cleaner-cli.ts) and [`src/node-cache-cleaner/`](../src/node-cache-cleaner/)
