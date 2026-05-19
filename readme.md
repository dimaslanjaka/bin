# Binary Collections
A comprehensive toolkit of Node.js CLI utilities for streamlining development workflows. Includes tools for git operations, dependency management, build processes, automation, and more.

## Features

- 🧹 **Cleanup Tools**: Instantly remove `node_modules`, yarn caches, and gradle builds.
- 🔄 **Git Utilities**: Manage submodules, purge repositories, and fix cross-platform encoding issues.
- 📦 **Build Tools**: Enhanced NPM script runners and package resolution managers.
- ⚡ **Development Helpers**: Process management, environment setup, and file system operations.

## Installation

### Option 1: NPM Package
Install locally to your project or globally for system-wide access.

```bash
# Local installation
npm install binary-collections

# Global installation
npm install binary-collections -g

# Install from specific release archive
npm install binary-collections@https://github.com/dimaslanjaka/bin/raw/master/releases/bin.tgz
```

### Option 2: Direct Execution
Run without installing using `npx` or `yarn dlx`.

```bash
# Using Yarn Berry
yarn dlx binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz <command-name>

# Using NPX
npx -y binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz <command-name>
```

### Option 3: Clone Repository
For development or manual setup.

```bash
git clone -b master https://github.com/dimaslanjaka/bin bin
```

## VSCode Integration

To make these tools available directly in your VSCode terminal, create or update `.vscode/settings.json`:

```jsonc
{
  "terminal.integrated.env.linux": {
    "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/usr/lib/wsl/lib:${workspaceFolder}/bin:${workspaceFolder}/node_modules/.bin:${workspaceFolder}/vendor/bin",
    "PUPPETEER_SKIP_DOWNLOAD": "true"
  },
  "terminal.integrated.env.windows": {
    "PATH": "${env:LOCALAPPDATA}\\nvm;C:\\nvm4w\\nodejs;C:\\Program Files\\Git\\cmd;C:\\Program Files\\Git\\usr\\bin;${env:PATH};${workspaceFolder}\\node_modules\\.bin;${workspaceFolder}\\bin;${workspaceFolder}\\vendor\\bin;C:\\laragon\\bin\\mysql\\mysql-8.4.3-winx64\\bin;C:\\Users\\Dell\\AppData\\Local\\Programs\\Ollama",
    "PUPPETEER_SKIP_DOWNLOAD": "true"
  },
  "terminal.integrated.profiles.windows": {
    "PowerShell": {
      "source": "PowerShell",
      "icon": "terminal-powershell"
    },
    "Short PowerShell": {
      "source": "PowerShell",
      "args": [
        "-NoExit",
        "-Command",
        "function prompt { \"[$((Get-Item .).Name)]> \" }"
      ],
      "icon": "terminal-powershell"
    },
    "Command Prompt": {
      "path": [
        "${env:windir}\\Sysnative\\cmd.exe",
        "${env:windir}\\System32\\cmd.exe"
      ],
      "args": [],
      "icon": "terminal-cmd"
    },
    "Short Command Prompt": {
      "path": [
        "${env:windir}\\System32\\cmd.exe"
      ],
      "args": [
        "/k",
        "prompt $p$_$g"
      ],
      "icon": "terminal-cmd"
    },
    "Git Bash": {
      "source": "Git Bash"
    },
    "Cygwin": {
      "path": "C:\\cygwin64\\bin\\bash.exe",
      "args": [
        "--login",
        "-i"
      ],
      "env": {
        "CHERE_INVOKING": "1"
      }
    }
  },
  "terminal.integrated.defaultProfile.windows": "Command Prompt"
}
```

## Available Tools

To view a complete list of available binaries, run:
```bash
binary-collections list
```

### Quick Reference

| Category | Commands | Description |
|---|---|---|
| **Git** | `git-purge`, `git-diff`, `git-fix`, `git-reduce-size` | Git repository management and optimization |
| **Submodules** | `submodule`, `submodule-install`, `submodule-remove`, `submodule-token` | Git submodule operations |
| **NPM Scripts** | `nrs`, `run-s`, `run-series`, `npm-run-series` | Run npm scripts in series with pattern matching |
| **Package Mgmt** | `yarn-reinstall`, `pkg-resolutions-updater`, `pkg-res-updater` | Yarn/package resolutions management utilities |
| **Node.js Dev** | `find-node-modules`, `find-nodemodules`, `dev`, `prod`, `empty` | Node.js development helpers |
| **Process Mgmt** | `kill-process`, `nodekill`, `javakill`, `del-ps` | Process management and termination |
| **File System** | `rmfind`, `rmpath`, `rmx`, `print-tree`, `dir-tree` | File system operations |
| **Cleanup** | `del-nodemodules`, `del-yarncaches`, `del-gradle` | Cache and build directory cleanup |
| **GitHub Actions** | `clean-github-actions-caches`, `clean-github-actions-cache`, `clear-github-actions-cache`, `clear-github-actions-caches`, `clear-gh-caches` | Remove old GitHub Actions caches, keep only latest |

### Git Tools

#### Git Repository Purge
Cleans and optimizes git repositories by pruning reflogs.

```bash
git-purge
```

![Git purge screenshot](https://github.com/dimaslanjaka/bin/assets/12471057/2805c54e-28a7-491d-b381-de2593a854b3)

#### Git Diff Utility
Enhanced diff functionality for repository inspection.

```bash
git-diff
```

#### Git Fix Utility
A comprehensive configuration fixer for cross-platform development (replaces `git-fix-encoding`). It is now non-interactive and argument-driven.

```bash
git-fix                          # Apply all default fixes
git-fix --lf-only                # Force LF line endings only
git-fix --permissions            # Ignore file permissions only
git-fix --normalize              # Normalize existing files only
git-fix --user                   # Configure Git user from env vars
git-fix --user NAME EMAIL        # Configure Git user with specific values
git-fix --user --update-remote   # Configure user and update remote URL
```

**Features:**
- Forces LF line endings (`core.autocrlf = false`)
- Ignores file permission changes (`core.filemode = false`)
- Sets pull strategy to prevent auto-rebase
- Normalizes existing line endings
- Creates/updates `.gitattributes`

**User Configuration:**
- Uses Environment variables: `GITHUB_USER`, `GITHUB_EMAIL` (if no args provided).
- Use `--update-remote` to automatically update the remote URL to match the configured user (HTTPS remotes).

#### Git Repository Size Reducer
Reduces repository size by cleaning up history.

```bash
git-reduce-size
```

#### Submodule Management
Manage git submodules effortlessly.

- **`submodule`**: General operations.
- **`submodule-install`**: Install and setup submodules.
- **`submodule-remove`**: Interactive removal of submodules.
- **`submodule-token`**: Manage authentication tokens.

![Submodule remover screenshot](https://github.com/user-attachments/assets/659c2fa3-f12f-45cb-a66f-aed3807e0023)

---

### NPM Script Runner
**Binaries**: `nrs`, `run-s`, `run-series`, `npm-run-series`

Execute multiple npm scripts in series using pattern matching.

#### Options
| Flag | Description |
| :--- | :--- |
| `--yarn` | Use `yarn run` instead of `npm run`. |
| `--verbose`, `-v` | Enable verbose logging. |

#### Example
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

---

### Package Management

#### Yarn Package Reinstaller
Reinstall packages with specific dependency types.

```bash
yarn-reinstall <packageName> [--dev|-D|--peer|-P|--optional|-O]
```

#### Package Resolutions Manager
Manage `resolutions` in `package.json` (Aliases: `pkg-resolutions-updater`, `pkg-res-updater`).

```bash
pkg-resolutions-updater
```

---

### Node.js Development Tools

#### Find Node Modules
Locate all `node_modules` directories within a project.

```bash
find-node-modules      # Library function
find-node-modules-cli  # CLI tool
find-nodemodules       # Alias
```

#### Environment Helpers
- **`dev`**: Setup development environment variables.
- **`prod`**: Setup production environment variables.
- **`empty`**: A no-op utility placeholder.

---

### Process Management

Terminate processes quickly by name or type.

```bash
kill-process    # General process killer
nodekill        # Kill Node.js processes
javakill        # Kill Java processes (Windows specific)
del-ps          # Kill processes by command name
```

---

### Cleanup Tools

#### GitHub Actions Cache Cleaner
Remove old GitHub Actions caches and leaving last one to free up space.
**Aliases**: `clean-github-actions-cache`, `clear-gh-caches`, etc.
```bash
clean-github-actions-caches
```
*[Full Documentation](./docs-src/clean-github-actions-caches.md)*

#### Node Modules Cleaner
Recursively remove `node_modules` directories.

```bash
del-nodemodules        # Primary command
# Aliases: del-node-modules, clean-nodemodule, clean-nodemodules
```

Additional tool: `rm-node-modules` — a faster alternative for very large
projects. It removes `node_modules` subfolders by first-letter in parallel,
which can speed up deletion on filesystems with many packages.

Usage examples:

```bash
# Run from the project root
node src/rm-node-module-cli.cjs
npx binary-collections rm-node-modules
yarn run rm-node-modules
```

Note: On Windows this requires a Unix-compatible shell in `PATH` (for
example, Git Bash or WSL).

![Node modules cleaner screenshot](https://github.com/dimaslanjaka/bin/assets/12471057/f03e5b51-1808-4e82-a474-0dd3c7eab5fe)

#### System Cache Cleaners
```bash
del-yarncaches    # Clear Yarn cache
del-gradle        # Delete Gradle build folders
```

#### Automation Tools
- **Free ChatGPT automation tool**: *[See documentation](./docs-src/free-chatgpt.md)*

---

## Troubleshooting

### Submodule Installation Issues

**Error:**
```log
fatal: 'origin/<branch>' is not a commit and a branch '<branch>' cannot be created from it
fatal: unable to checkout submodule '<folder>/<submodule>'
```

**Solution:**
Delete the `.git/modules` directory before running `submodule-install`.

**Complete Reset & Install:**
```bash
echo "Initializing submodules..."
git submodule init
git submodule foreach "git submodule init"

echo "Syncing submodules..."
git submodule sync
git submodule foreach "git submodule sync"

echo "Updating submodules..."
npx --yes rimraf .git/modules
npx --yes binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz submodule-install
```

## Development

### Binary List Generation
The list of available binaries is auto-generated by [`build.mjs`](./build.mjs). This script scans `bin/`, `lib/`, and updates the `bin` field in `package.json`.

To update the binary list:
```bash
yarn run build
# or
node build.mjs
```

### Project Structure
- **Source Code**: Located in the `src/` folder.
- **Binaries**: Executable scripts located in `bin/`.
- **Libraries**: Reusable modules in `lib/`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the terms specified in the [LICENSE](./LICENSE) file.
