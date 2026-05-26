# Run by Checksum

Run a command only when the checksum of matched files changes. Computes SHA-256 hashes of all matching files, stores them in a cache under `tmp/.checksum/`, and compares on subsequent runs to determine if the command should execute again.

## Usage

```bash
run-by-checksum -p "<glob>" -e "<command>"
```

### Aliases

This command is available under several aliases (all invoke the same CLI):

- `run-by-checksum` (default)
- `run-checksum`
- `run-c`

### Options

| Flag | Type | Description |
| :--- | :--- | :--- |
| `-p`, `--pattern` | `string[]` | Glob pattern(s) to include (can be repeated) |
| `-i`, `--ignore` | `string[]` | Glob pattern(s) to exclude (can be repeated) |
| `-e`, `--exec` | `string` | Command to execute when checksum changes |
| `-h`, `--help` | `boolean` | Show help message |

### Examples

Run a build script when any `.js` or `.ts` file changes:

```bash
run-by-checksum -p "src/**/*.js" -p "src/**/*.ts" -e "npm run build"
```

Ignore node_modules and run tests when source files change:

```bash
run-by-checksum -p "src/**/*.js" -i "**/node_modules/**" -e "npm test"
```

### How it works

1. **Scan**: All files matching the given glob patterns are collected.
2. **Hash**: SHA-256 checksums are computed for each matched file's content and combined into a single hash.
3. **Compare**: The combined hash is compared against a previously cached hash stored in `tmp/.checksum/<md5-key>.json`.
4. **Execute**: If the hash differs (files have changed), the specified command is executed and the cache is updated.
5. **Skip**: If the hash matches (no changes), the command is skipped.

### Programmatic API

The core logic can also be imported directly:

```js
import { runChecksum } from './src/run-by-checksum/run.js';

await runChecksum({
  patterns: ['src/**/*.js'],
  ignore: ['**/node_modules/**'],
  exec: 'npm run build',
  cwd: process.cwd(),
  dryRun: false  // set to true to detect changes without executing
});
```

The function returns:

```ts
{
  changed: boolean,     // whether files changed since last run
  cacheFile: string,    // path to the cache file
  files: string[],      // list of matched files
  skipped?: boolean     // only present when dryRun=true and changes detected
}
```

## Source

See [`src/run-by-checksum-cli.js`](../src/run-by-checksum-cli.js) (CLI) and [`src/run-by-checksum/`](../src/run-by-checksum/) (core logic).
