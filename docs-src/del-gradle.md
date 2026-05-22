## Gradle Build Cleaner

Deletes Gradle `build/` directories.

### Usage

```bash
del-gradle
```

### Description

Searches for `build.gradle` files and deletes the adjacent `build/` directories, ignoring `node_modules` and `vendor` directories.

### Source

See [`src/del-gradle.js`](../src/del-gradle.js)
