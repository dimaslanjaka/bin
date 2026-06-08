## Gradle Build Cleaner

Deletes Gradle `build/` directories and optionally cleans user-level Gradle cache/temp directories.

### Aliases

- `del-gradle` (default)

### Usage

```bash
del-gradle [options]
```

### Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help message |
| `-g, --global` | Also clean user-level Gradle cache/temp directories (`caches/`, `wrapper/dists/`, `daemon/`, `native/`, `buildOutputCleanup/` under `~/.gradle`) |

### Description

- **Default mode** (no flags): Searches for `build.gradle` files and deletes the adjacent `build/` directories, ignoring `node_modules` and `vendor` directories
- **With `-g` / `--global`**: After cleaning project `build/` directories, also removes known Gradle cache and temp directories from the Gradle user home (`~/.gradle`):
  - `caches/` — module artifacts, transformed classes
  - `wrapper/dists/` — downloaded Gradle wrapper distributions
  - `daemon/` — daemon registry and output logs
  - `native/` — native platform library extraction
  - `buildOutputCleanup/` — build output cleanup cache

### Source

See [`src/del-gradle.cjs`](../src/del-gradle.cjs) (core logic in [`src/cache-cleaner/gradle.cjs`](../src/cache-cleaner/gradle.cjs)).
