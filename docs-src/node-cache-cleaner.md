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

---

## Yarn Cache Cleaner (Python)

Python-based utility to clean Yarn caches.

### Usage

```bash
yarn-clean
```

### Description

Runs `yarn-clean.py` which locates and cleans Yarn cache directories. Available as a shell wrapper in both bash and batch variants.

### Source

See [`bin/yarn-clean`](../bin/yarn-clean) & [`bin/yarn-clean.py`](../bin/yarn-clean.py)

---

## yc / ycw

Shell scripts to clean `node_modules` directories in parallel.

### Usage

```bash
yc [options]
ycw [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help message |
| `-c, --concurrent <num>` | Maximum parallel jobs (default: 4) |

### Description

- **`yc`** — Cleans `node_modules` via letter-based parallel deletion of top-level entries (a-z) inside `node_modules/`
- **`ycw`** — Yarn workspaces–aware variant. Detects monorepo root, expands workspace globs, and cleans `node_modules` across root + all workspace packages in parallel

### Source

See [`bin/yc`](../bin/yc) & [`bin/ycw`](../bin/ycw)

