# Install OpenCode Plugins

CLI tool that automates the installation of recommended OpenCode plugins. Runs a series of `git clone` and `opencode plugin` commands sequentially to set up a collection of plugins in one invocation.

## Usage

```bash
install-opencode-plugins [options]
```

### Aliases

This command is available under several aliases (all invoke the same CLI):

- `install-opencode-plugins` (default)
- `install-opc-plugins`
- `opc-plugins`

### What it installs

The tool runs the following commands in order:

1. **opencode-request-logger** — Clones the request logger plugin into `.opencode/plugins/opencode-request-logger`:
   ```bash
   git clone https://github.com/Opencode-DCP/opencode-request-logger.git .opencode/plugins/opencode-request-logger
   ```
   *Note: Skipped if the folder already exists.*

2. **Register local request-logger plugin** — Installs the cloned plugin from the local path:
   ```bash
   opencode plugin .opencode/plugins/opencode-request-logger
   ```

3. **opencode-agent-memory** — Installs the file memory plugin from a remote tarball:
   ```bash
   opencode plugin opencode-agent-memory@https://github.com/dimaslanjaka/opencode-file-memory/raw/refs/heads/main/release/opencode-agent-memory.tgz
   ```

4. **@tarquinen/opencode-smart-title** — Installs smart title generation:
   ```bash
   opencode plugin @tarquinen/opencode-smart-title@latest
   ```

5. **oh-my-opencode-slim** — Installs the slim OpenCode enhancement pack:
   ```bash
   opencode plugin oh-my-opencode-slim@latest
   ```

6. **@tarquinen/opencode-dcp** — Installs DCP (Deep Context Protocol) support:
   ```bash
   opencode plugin @tarquinen/opencode-dcp@latest
   ```

7. **envsitter-guard** — Installs the environment variable security guard:
   ```bash
   opencode plugin envsitter-guard@latest
   ```

### Options

| Flag | Description |
| :--- | :--- |
| `-h`, `--help` | Show help message |

### Example

```bash
install-opencode-plugins
```

### How it works

1. The tool iterates through a predefined array of commands (git clone + opencode plugin installs).
2. Each command runs **sequentially** using `cross-spawn` with `stdio: 'inherit'` (output visible in real time) and `shell: true` (resolves binaries via the user's shell PATH).
3. If any command exits with a non-zero code, execution stops immediately and an error message is printed.
4. On success, it prints "All commands executed successfully!".

### Prerequisites

- `git` must be available on `PATH`.
- `opencode` CLI must be installed and available on `PATH`.
- The plugins are installed into the current working directory's `.opencode/plugins/` folder.

## Source

See [`src/opencode/install-opencode-plugins-cli.ts`](../src/opencode/install-opencode-plugins-cli.ts).
