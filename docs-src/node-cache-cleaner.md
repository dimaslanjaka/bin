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

---

## Node Modules Cleaner

Recursively finds and removes `node_modules` directories.

### Aliases

- `del-nodemodules` (default)
- `del-node-modules`

### Usage

```bash
del-nodemodules [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--force`, `-f` | Actually delete (default is dry-run mode) |
| `-c, --concurrent N` | Set concurrent removals (default: 2, or CPU count) |
| `-h, --help` | Show help message |

### Description

- Searches for all `node_modules` directories recursively
- Also removes `package-lock.json`, `yarn.lock`, and `.yarn/cache` directories
- By default runs in dry-run mode (shows what would be deleted)
- Pass `--force` to actually perform deletion

### Source

See [`src/del-node-modules.js`](../src/del-node-modules.js)

---

## Yarn Cache Cleaner

Deletes Yarn cache directories and cached `.gz` files.

### Aliases

- `del-yarncaches` (default)
- `del-yarn-caches`

### Usage

```bash
del-yarncaches
```

### Description

Finds and deletes all `.yarn/cache*` directories and `.yarn/*.gz` files under the current working directory, excluding `.git` and `vendor` directories.

### Source

See [`src/del-yarn-caches.js`](../src/del-yarn-caches.js)

---

## Remove Node Modules (Fast)

Alternative tool for removing `node_modules` — faster for very large projects. Removes subfolders by first-letter in parallel.

### Aliases

- `rm-node-modules` (default)
- `rm-node-module`
- `remove-node-modules`
- `remove-node-module`

### Usage

```bash
rm-node-modules [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--force` | Actually delete (default is dry-run mode) |
| `-h, --help` | Show help message |

### Description

- Removes `node_modules` subfolders by first-letter in parallel (a-z, A-Z)
- Writes and executes a temporary shell script (auto-removed after completion)
- On Windows requires a Unix-compatible shell in `PATH` (e.g., Git Bash or WSL)

### Examples

```bash
npx --legacy-peer-deps -y binary-collections rm-node-modules
npx --legacy-peer-deps -y binary-collections rm-node-modules --force
yarn run rm-node-modules
```

### Source

See [`src/rm-node-module-cli.cjs`](../src/rm-node-module-cli.cjs) & [`src/rm-node-modules.cjs`](../src/rm-node-modules.cjs)

