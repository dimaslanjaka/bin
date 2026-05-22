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
