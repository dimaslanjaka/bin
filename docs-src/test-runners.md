## Jest Test Runners

Run Jest tests for CommonJS or ESM modules.

### Commands

| Command | Description |
|---------|-------------|
| `test-cjs` | Run Jest for CommonJS tests |
| `test-esm` | Run Jest for ESM tests (with `--experimental-vm-modules`) |

### Usage

```bash
test-cjs [jest-options...]
test-esm [jest-options...]
```

### Source

See [`bin/test-cjs`](../bin/test-cjs) & [`bin/test-esm`](../bin/test-esm)
