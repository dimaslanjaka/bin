# Upload Backend

Uploads PHP files from the `php_backend/` directory to a remote server via SFTP. Reads the connection configuration from `.vscode/sftp.json` and deploys all `.php` files into `{remotePath}/php_backend` on the target server.

## Usage

```bash
node scripts/upload-backend.mjs
```

### Prerequisites

- An SFTP server configured in `.vscode/sftp.json`
- PHP files present in the `php_backend/` directory

### Behavior

1. Reads `.vscode/sftp.json` for host, port, username, and password
2. Scans `php_backend/` for all `*.php` files
3. Connects to the remote server via SFTP
4. Creates the `php_backend` subdirectory under the configured `remotePath`
5. Uploads each PHP file into that directory
6. Prints a confirmation per uploaded file

If no PHP files are found, the script exits with a notice.

## Source

See [`scripts/upload-backend.mjs`](../scripts/upload-backend.mjs).
