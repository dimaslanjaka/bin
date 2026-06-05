# OpenCode CLI

CLI tool for inspecting and managing an OpenCode database. Connects to the local OpenCode SQLite database (`~/.local/share/opencode/opencode.db`) to list sessions and projects, and to delete sessions or projects. Also supports API key rotation from a local keys file.

## Usage

```bash
opc <command> [subcommand] [options]
```

### Aliases

This command is available under several aliases (all invoke the same CLI):

- `opc` (default)
- `opencode-cli`

### Commands

#### `list session`

Lists all sessions in a table format showing slug, title, and version.

```bash
opc list session
```

#### `list project`

Lists all projects in a table format showing truncated ID, name, and worktree path.

```bash
opc list project
```

#### `delete session <id>`

Deletes a single session and all its descendant sessions by ID.

```bash
opc delete session <session-id>
```

#### `delete sessions`

Deletes **all** sessions from the database (irreversible).

```bash
opc delete sessions
```

#### `delete project <id>`

Deletes a project's sessions and project record from the OpenCode database (not the real project folder on disk).

The `<id>` is the project UUID shown in the first column of `opc list project`. Run that command first to find the project ID you want to delete.

```bash
opc delete project <project-id>
```

#### `auth rotate`

Rotates the active OpenCode API key by picking the first working key from a local keys file. Iterates through available keys (excluding the current one) and tests each against the OpenCode API, selecting the first that returns a valid response.

```bash
opc auth rotate
```

Use `--proxy` to route API requests through a proxy server:

```bash
opc auth rotate --proxy socks5://127.0.0.1:1080
```

### Options

| Flag | Description |
| :--- | :--- |
| `-h`, `--help` | Show help message |
| `-p`, `--proxy <url>` | Proxy URL for API requests. Supports `http://`, `https://`, `socks4://`, `socks5://` protocols. Format: `protocol://ip:port` or `protocol://user:pass@ip:port` |

### Examples

List all sessions:

```bash
opc list session
```

Delete a specific session:

```bash
opc delete session abc123
```

Delete a project's sessions and project record from the OpenCode database (ID obtained from `opc list project`):

```bash
opc delete project 9a3bb589
```

Rotate to a working API key:

```bash
opc auth rotate
# → Rotated OpenCode API key to: my-backup-key
```

Rotate through a SOCKS5 proxy:

```bash
opc auth rotate --proxy socks5://127.0.0.1:1080
```

### How it works

1. **Database check**: On every command except `--help`, the tool first verifies the OpenCode database is accessible via `checkDatabase()`.
2. **List**: Queries the `session` or `project` table and displays results in formatted tables with dynamic column widths.
3. **Delete**: Uses recursive SQL (Common Table Expressions) to delete sessions and their descendants, or cascading deletes for project sessions.
4. **Auth rotate**: Reads `opencode.keys` from the project config (via `getConfig()`), filters out the currently active key, tests each remaining key via `checkOpenCodeApi()`, and sets the first one that responds successfully. If `--proxy` is provided, it's passed through to `checkOpenCodeApi()` which creates a `ProxyAgent` for the HTTP/SOCKS proxy.

### Requirements

For `auth rotate`, add an `opencode.keys` array to your [project config](../readme.md#configuration). Create a `binary-collections.config.{js,cjs,mjs}` file:

```js
// binary-collections.config.js (ESM) or .cjs (CJS)
export default {
  opencode: {
    keys: [
      { name: 'primary', key: 'sk-xxxxxx' },
      { name: 'backup', key: 'sk-yyyyyy' }
    ]
  }
};
```

## Source

See [`src/opencode-cli.ts`](../src/opencode-cli.ts).
