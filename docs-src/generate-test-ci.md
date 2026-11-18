# Generate Test CI Step

Scans the repository for test files using glob patterns and generates GitHub Actions YAML files from JS fixtures:

- `.github/workflows/test.yml` — workflow with individual test steps for each detected file
- `.github/actions/setup-environments/action.yml` — composite action from the JS fixture

Untracked (non-git) test files are automatically skipped unless `testRunner.skipUntracked` is set to `false`.

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

## Custom Test Command

You can customize how test files are executed in CI by configuring `testRunner` in your `binary-collections.config.js`. Add a `testRunner` block like this:

```js
export default {
  testRunner: {
    // Shell command template for running a single test file.
    // Supported tokens:
    //   {{file}}        relative test file path, e.g. test/foo.test.js
    //   {{filename}}    basename only, e.g. foo.test.js
    //   {{pathPattern}} pathPattern (filename for test/ dir, else relative path)
    template: 'npx vitest run {{pathPattern}}',

    // Runner executable (ignored when template is set).
    // Defaults to jest auto-detected from package.json type.
    bin: 'npx vitest',

    // Extra args appended before --testPathPatterns (ignored when template is set).
    args: ['--runInBand', '--forceExit', '--testTimeout=120000'],

    // Skip git-untracked test files (default true).
    skipUntracked: true
  }
};
```

When omitted, `testRunner` defaults to the built-in Jest fallback: ESM packages run with `node --experimental-vm-modules`, CJS with plain `node`, both forwarding `--testPathPatterns`.

### Examples

**Vitest per-file steps:**
```js
testRunner: {
  template: 'npx vitest run {{pathPattern}}'
}
```

**Custom template with Jest and `{{file}}`:**
```js
testRunner: {
  template: 'yarn test --runInBand --testTimeout=120000 --detectOpenHandles --bail=1 --testPathPatterns="{{file}}"'
}
```

**Custom runner binary with extra args:**
```js
testRunner: {
  bin: 'mocha',
  args: ['--require', 'ts-node/register']
}
```

**Disable untracked-file filtering:**
```js
testRunner: {
  skipUntracked: false
}
```

## Examples

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

1. **Load config**: Reads `binary-collections.config.js` for `testRunner` customization.
2. **Collect**: All files matching the given glob patterns are collected using the `glob` library.
3. **Filter**: Files not tracked by git are skipped unless `testRunner.skipUntracked` is `false`.
4. **Command**: Builds the test command per file using `testRunner.template` (with token substitution), `testRunner.bin`/`testRunner.args`, or the built-in Jest fallback.
5. **Generate workflow**: A GitHub Actions workflow YAML is produced with per-file test steps.
6. **Write workflow**: The workflow YAML is written to the specified output path (default `.github/workflows/test.yml`).
7. **Generate action**: The composite action fixture (`ci-yaml-fixtures/setup-environments-data.cjs`) is serialized to `.github/actions/setup-environments/action.yml`, keeping the reusable action in sync with its JS source.

## Source

See [`src/github-workflows/generate-test-ci-step-cli.mjs`](../src/github-workflows/generate-test-ci-step-cli.mjs).
