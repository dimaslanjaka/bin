## Binary Collections (Main Dispatcher)

The main entry point that dynamically finds and executes other scripts by name.

### Usage

```bash
npx binary-collections <script-name> [...args]
```

### Subcommands

| Subcommand | Description |
|------------|-------------|
| `list` | List all available scripts |
| `<script-name>` | Find and execute a script by name |
| `-h, --help` | Show help message |

### Examples

```bash
npx binary-collections list
npx binary-collections git-diff -s
npx binary-collections del-node-modules --force
npx binary-collections find-node-modules
```

### Development

When developing locally, use `bc <commandName>` (`bin/bc` on Unix or `bin/bc.cmd` on Windows). Its usage is the same as `binary-collections <commandName>`.

### Source

See [`src/binary-collections.cjs`](../src/binary-collections.cjs) & [`bin/bc`](../bin/bc)
