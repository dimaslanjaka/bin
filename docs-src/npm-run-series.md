## NPM Script Runner

Execute multiple npm scripts in series using pattern matching.

### Aliases

This command is available under several aliases (all invoke the same CLI):

- `nrs` (default)
- `run-s`
- `run-series`
- `npm-run-series`

### Usage

```bash
nrs <glob-pattern-of-script-names> [options]
```

### Options

| Flag | Description |
| :--- | :--- |
| `--yarn` | Use `yarn run` instead of `npm run` |
| `--verbose`, `-v` | Enable verbose logging |

### Example

Define a script to run all tasks matching a pattern:

```json
{
  "scripts": {
    "build:app": "echo 'building app'",
    "build:lib": "echo 'building lib'",
    "build:all": "nrs --yarn --verbose \"build:**\""
  }
}
```

### Source

See [`src/npm-run-series.cjs`](../src/npm-run-series.cjs)
