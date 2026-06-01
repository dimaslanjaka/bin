# OpenCode CLI

CLI tool for inspecting and managing an OpenCode database. Connects to the local OpenCode SQLite database (`~/.local/share/opencode/opencode.db`) to list sessions and projects, and to delete sessions or projects.

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

Deletes a project and all its associated sessions.

```bash
opc delete project <project-id>
```

### Options

| Flag | Description |
| :--- | :--- |
| `-h`, `--help` | Show help message |

### Examples

List all sessions:

```bash
opc list session
```

Delete a specific session:

```bash
opc delete session abc123
```

Delete an entire project and its sessions:

```bash
opc delete project 9a3bb589
```

### How it works

1. **Database check**: On every command except `--help`, the tool first verifies the OpenCode database is accessible via `checkDatabase()`.
2. **List**: Queries the `session` or `project` table and displays results in formatted tables with dynamic column widths.
3. **Delete**: Uses recursive SQL (Common Table Expressions) to delete sessions and their descendants, or cascading deletes for project sessions.

## Source

See [`src/opencode-cli.ts`](../src/opencode-cli.ts) (CLI) and [`src/opencode/database.ts`](../src/opencode/database.ts) (database layer).
