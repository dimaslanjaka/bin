# 🚀 Binary Collections

<details>
<summary>Build Release CI</summary>

![Build Release](http://sh.webmanajemen.com/php_backend/workflow-badge.php?owner=dimaslanjaka&repo=bin&workflow=build-release.yml)

</details>

<details>
<summary>Pages CI</summary>

![Pages](http://sh.webmanajemen.com/php_backend/workflow-badge.php?owner=dimaslanjaka&repo=bin&workflow=pages.yml)

</details>

<details>
<summary>Test CI</summary>

![Test](http://sh.webmanajemen.com/php_backend/workflow-badge.php?owner=dimaslanjaka&repo=bin&workflow=test.yml)

</details>

A comprehensive toolkit of Node.js CLI utilities designed to streamline everyday development workflows.

It provides fast, lightweight commands for common tasks like git operations, dependency management, submodule handling, conditional execution, CI workflow generation, and running npm scripts in sequence or parallel—helping you reduce repetitive work and improve terminal productivity.

## ✨ Features

* ⚡ **Git Workflow Utilities**
  Streamline common Git tasks including diff enhancements, status automation, submodule management, and repository cleanup.

* 🧹 **Cleanup Tools**
  Quickly remove `node_modules`, clear package manager caches (npm/yarn), and clean build artifacts such as Gradle outputs.

* 🔁 **Task Orchestration**
  Run npm scripts sequentially or in parallel with improved control and execution clarity.

* 🔐 **Conditional Execution**
  Run commands only when file contents change — uses SHA-256 checksums to detect modifications and skip unnecessary re-executions.

* 📁 **Repository & Submodule Automation**
  Simplify initialization, syncing, and maintenance of Git submodules and multi-repository setups.

* 📦 **Build & Package Utilities**
  Enhance NPM workflows with improved script execution, dependency handling, resolution helpers, and automatic tarball packaging.

* 🛠️ **Development Helpers**
  General-purpose utilities for process management, environment setup, file system operations, downloads, and archive inspection.

* 🤖 **AI & IDE Tooling**
  Inspect and manage OpenCode databases, browse VS Code workspace storage, and list Copilot memory tool directories.

* 🔄 **CI/CD Automation**
  Generate GitHub Actions workflow YAML from test file detection, query latest workflow run status, generate live SVG status badges, and clean up stale action caches automatically.

* 🚀 **Performance-Focused CLI Design**
  Lightweight, fast-executing commands designed to reduce friction and speed up everyday development tasks.

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
npx --legacy-peer-deps -y binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz <command-name>
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

### Quick Reference & Command Documentation

| Category | Commands | Description | Docs |
|---|---|---|---|
| **Git** | `git-purge`, `git-diff`, `git-fix`, `git-reduce-size`, `git-undo-commit`, `git-undo-staged` | Git repository management, diff enhancements, undo helpers, and optimization | [`git-purge.md`](./docs-src/git-purge.md), [`git-diff.md`](./docs-src/git-diff.md), [`git-fix.md`](./docs-src/git-fix.md), [`git-reduce-size.md`](./docs-src/git-reduce-size.md), [`git-undo.md`](./docs-src/git-undo.md) |
| **Submodules** | `submodule-install`, `submodule-remove`, `submodule-token` | Git submodule operations with authentication token injection | [`submodule-install.md`](./docs-src/submodule-install.md), [`submodule-remove.md`](./docs-src/submodule-remove.md), [`submodule-token.md`](./docs-src/submodule-token.md) |
| **NPM Scripts** | `nrs`, `run-s`, `run-series`, `npm-run-series` | Run npm scripts in series with pattern matching | [`npm-run-series.md`](./docs-src/npm-run-series.md) |
| **Conditional Execution** | `run-by-checksum`, `run-checksum`, `run-c` | Run commands only when file checksums change (SHA-256 based) | [`run-by-checksum.md`](./docs-src/run-by-checksum.md) |
| **Build & Package** | `node-package-packer`, `tarball-packer`, `pack-tarball`, `build-tarball`, `build-package` | Automated tarball creation, release packaging, and metadata generation | [`node-package-packer.md`](./docs-src/node-package-packer.md) |
| **Package Mgmt** | `yarn-reinstall`, `pkg-resolutions-updater`, `pkg-res-updater`, `yarn-install`, `yarn-clean` | Yarn/package resolutions management utilities | [`yarn-reinstall.md`](./docs-src/yarn-reinstall.md), [`yarn-install.md`](./docs-src/yarn-install.md), [`node-cache-cleaner.md`](./docs-src/node-cache-cleaner.md), [`package-resolutions-updater.md`](./docs-src/package-resolutions-updater.md) |
| **Node.js Dev** | `find-node-modules`, `find-nodemodules`, `dev`, `prod`, `empty`, `node-cache-cleaner`, `node-executor`, `py` | Node.js development helpers | [`find-node-modules.md`](./docs-src/find-node-modules.md), [`env-helpers.md`](./docs-src/env-helpers.md), [`node-cache-cleaner.md`](./docs-src/node-cache-cleaner.md), [`node-executor.md`](./docs-src/node-executor.md), [`py.md`](./docs-src/py.md) |
| **Process Mgmt** | `kill-process`, `nodekill`, `javakill`, `del-ps`, `kill-night-crows` | Process management and termination | [`del-ps.md`](./docs-src/del-ps.md), [`kill-night-crows.md`](./docs-src/kill-night-crows.md) |
| **File System** | `rmfind`, `rmx`, `rmpath`, `print-tree`, `dir-tree`, `copy`, `move`, `remove-module`, `downloader`, `download`, `fetch-file`, `print-tarball-tree`, `tarball-tree` | File system operations, URL downloads, archive tree inspection | [`copy-move-file.md`](./docs-src/copy-move-file.md), [`rmpath.md`](./docs-src/rmpath.md), [`rmfind-rmx.md`](./docs-src/rmfind-rmx.md), [`print-directory-tree.md`](./docs-src/print-directory-tree.md), [`remove-module.md`](./docs-src/remove-module.md), [`downloader.md`](./docs-src/downloader.md), [`print-tarball-tree.md`](./docs-src/print-tarball-tree.md) |
| **Cleanup** | `del-nodemodules`, `del-yarncaches`, `del-gradle`, `del-yarn-caches`, `yarn-clean` | Cache and build directory cleanup | [`node-cache-cleaner.md`](./docs-src/node-cache-cleaner.md), [`del-gradle.md`](./docs-src/del-gradle.md) |
| **CI/GitHub Actions** | `clean-github-actions-caches`, `clear-gh-caches`, `generate-test-ci`, `get-latest-workflow-status`, `get-latest-workflow`, `latest-workflow`, `wf-status`, `workflow-badge`, `wf-badge`, `gh-status-badge`, `actions-badge` | GitHub Actions cache cleanup, automated CI workflow generation, workflow status inspection, and live SVG badge generation | [`clean-github-actions-caches.md`](./docs-src/clean-github-actions-caches.md), [`generate-test-ci.md`](./docs-src/generate-test-ci.md), [`get-latest-workflow-status.md`](./docs-src/get-latest-workflow-status.md), [`workflow-badge.md`](./docs-src/workflow-badge.md) |
| **AI & IDE Tooling** | `opc`, `opencode-cli`, `vscode-cli` | OpenCode database management (list/delete sessions and projects) and VS Code workspace inspection with Copilot memory detection | [`opencode-cli.md`](./docs-src/opencode-cli.md), [`vscode-cli.md`](./docs-src/vscode-cli.md) |
| **Other** | `binary-collections`, `changelog`, `php-cs-fixer-staged`, `free-chatgpt`, `test-runners` | Main dispatcher, changelog generation, PHP CS fixer for staged files, ChatGPT client, and Jest runners for CJS/ESM | [`binary-collections.md`](./docs-src/binary-collections.md), [`changelog.md`](./docs-src/changelog.md), [`php-cs-fixer-staged.md`](./docs-src/php-cs-fixer-staged.md), [`free-chatgpt.md`](./docs-src/free-chatgpt.md), [`test-runners.md`](./docs-src/test-runners.md) |

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

### Test Local Command Executor

When developing locally, to test the bundled executor run `bc <commandName>` (use `bin/bc` on Unix or `bin/bc.cmd` on Windows). Its usage is the same as `binary-collections <commandName>` but intended only for development and testing.

### Command List Generation
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
