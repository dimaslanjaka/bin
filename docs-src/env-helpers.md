## Environment Helpers

Set `NODE_ENV` and run a command in the configured environment.

### Commands

| Command | Description |
|---------|-------------|
| `dev <command>` | Sets `NODE_ENV=development` and runs the command |
| `prod <command>` | Sets `NODE_ENV=production` and runs the command |
| `empty` | No-op utility placeholder |

### Usage

```bash
dev <command> [args...]
prod <command> [args...]
```

### Examples

```bash
dev node server.js
prod npm start
```

### Source

See [`bin/dev`](../bin/dev) & [`bin/prod`](../bin/prod)
