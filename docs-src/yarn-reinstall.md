## Yarn Package Reinstaller

Reinstalls a yarn package by removing and re-adding it.

### Usage

```bash
yarn-reinstall <packageName> [--dev|-D|--peer|-P|--optional|-O]
```

### Options

| Option | Description |
|--------|-------------|
| `--dev`, `-D` | Add as dev dependency |
| `--peer`, `-P` | Add as peer dependency |
| `--optional`, `-O` | Add as optional dependency |

### Description

- Checks if the package is currently installed before removing
- Runs `yarn remove <packageName>` then `yarn add <packageName> [flags]`
- Skips removal if the package is not installed

### Source

See [`src/yarn-reinstall.cjs`](../src/yarn-reinstall.cjs)
