# Generate Test CI Step

Scans the repository for test files using glob patterns and generates a GitHub Actions workflow YAML (`.github/workflows/test.yml`) with individual test steps for each detected file. Untracked (non-git) files are automatically skipped.

## Usage

```bash
generate-test-ci [options]
```

### Aliases

This command is available under the following binary name:

- `generate-test-ci` (default)

### Options

| Flag | Type | Description |
| :--- | :--- | :--- |
| `-p`, `--pattern` | `string[]` | Test file glob pattern(s) to search for (can be repeated; defaults: `test/**/*.test.{js,cjs,mjs,ts}`, `test/**/*.spec.{js,cjs,mjs,ts}`, `tests/**/*.test.{js,cjs,mjs,ts}`, `tests/**/*.spec.{js,cjs,mjs,ts}`) |
| `--ignore`, `--ex` | `string[]` | Glob pattern(s) to exclude from results (can be repeated) |
| `-o`, `--output` | `string` | Output YAML file path (default: `.github/workflows/test.yml`) |
| `-h`, `--help` | `boolean` | Show help message |

### Examples

Generate the default workflow YAML:

```bash
generate-test-ci
```

Search only `.test.js` files:

```bash
generate-test-ci -p "test/**/*.test.js" --ignore "**/fixtures/**"
```

Write to a custom output path:

```bash
generate-test-ci -o .github/workflows/ci.yml -p "src/**/*.test.ts" --ignore "**/node_modules/**"
```

### How it works

1. **Collect**: All files matching the given glob patterns are collected using the `glob` library.
2. **Filter**: Files not tracked by git are skipped (so untracked files don't end up in the committed action).
3. **Classify**: Each file is categorized by extension (`.mjs` → `test-esm`, `.cjs` → `test-cjs`, `.ts` → `jest` directly, others → `npm test`).
4. **Generate**: A GitHub Actions workflow YAML is produced, with each test file as a separate `run` step.
5. **Write**: The YAML is written to the specified output path (default `.github/workflows/test.yml`).

## Source

See [`src/github-workflows/generate-test-ci-step-cli.mjs`](../src/github-workflows/generate-test-ci-step-cli.mjs).
