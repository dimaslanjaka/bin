# VSCode CLI

CLI tool for inspecting VS Code workspace storage directories. Scans the `workspaceStorage` folder under the VS Code user data directory, reads each subdirectory's `workspace.json`, and lists workspace projects with their storage identifiers. Optionally filters to workspaces that have a Copilot memory tool directory.

## Usage

```bash
vscode-cli <command> [subcommand] [options]
```

### Aliases

This command is available under the following alias:

- `vscode-cli` (default)

### Commands

#### `list project`

Lists all workspace projects in a table format showing truncated storage ID, folder path, and whether Copilot memory tool data exists.

```bash
vscode-cli list project
```

#### `list project --copilot-memory`

Lists only projects that have a Copilot memory tool directory (i.e., those where `GitHub.copilot-chat/memory-tool/memories` exists under the workspace storage directory).

```bash
vscode-cli list project --copilot-memory
```

Short aliases: `--copilotMemory`, `--cm`

### Options

| Flag | Description |
| :--- | :--- |
| `-h`, `--help` | Show help message |
| `--copilot-memory` | Filter to projects with Copilot memory tool |

### Examples

List all workspace projects:

```bash
vscode-cli list project
```

List only projects with Copilot memory tool data:

```bash
vscode-cli list project --copilot-memory
```

### How it works

1. **Scan**: Lists all subdirectories under the VS Code `workspaceStorage` folder (e.g., `%APPDATA%/Code/User/workspaceStorage` on Windows).
2. **Parse**: Reads `workspace.json` from each subdirectory to extract the workspace `folder` URI.
3. **Decode**: Converts `file:///` URIs to absolute filesystem paths (e.g., `file:///d%3A/Repositories/project` → `d:/Repositories/project`).
4. **Filter** (optional): When `--copilot-memory` is specified, only includes entries where `GitHub.copilot-chat/memory-tool/memories` exists on disk.
5. **Display**: Renders results in a formatted table with dynamic column widths.

### Programmatic API

The workspace scanning logic can also be imported directly:

```ts
import { listWorkspaceProjects } from './src/vscode/storage.js';

const projects = await listWorkspaceProjects();

// projects is WorkspaceEntry[] with:
//   storageId: string  — hash-based subdirectory name
//   folder: string     — absolute filesystem path (decoded URI)
//   storagePath: string — full path to the workspace storage subdirectory
//   copilotMemoryDir?: string — path to Copilot memory tool directory (if it exists)
```

## Source

See [`src/vscode-cli.ts`](../src/vscode-cli.ts).
