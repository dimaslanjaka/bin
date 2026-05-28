# Downloader

Downloads files from URLs over HTTP/HTTPS to the local filesystem. Uses `axios` with streaming to efficiently write downloaded content directly to disk, and supports up to 10 redirects.

## Usage

```bash
downloader <url> [output-path]
```

### Aliases

This command is available under several aliases (all invoke the same CLI):

- `downloader` (default)
- `download`
- `download-file`
- `file-downloader`
- `fetch-file`

### Arguments

| Argument      | Description                             |
| :------------ | :-------------------------------------- |
| `url`         | File URL to download (required)         |
| `output-path` | Optional destination path on disk       |

### Options

| Flag           | Description       |
| :------------- | :---------------- |
| `-h`, `--help` | Show help message |

### Behavior

- If no `output-path` is provided, the filename is derived from the URL's pathname (e.g., `https://example.com/file.zip` saves as `file.zip` in the current directory).
- If the URL path ends with `/` or has no filename segment, the default name `downloaded-file` is used.
- The output path is resolved to an absolute path, and any missing parent directories are created automatically.

### Examples

Download to the current directory (filename auto-derived from URL):

```bash
downloader https://example.com/file.zip
```

Download and save with a custom filename:

```bash
downloader https://example.com/file.zip downloads/custom.zip
```

Using an alias:

```bash
fetch-file https://example.com/data.json ./data/input.json
```

## Source

See [`src/downloader-cli.cjs`](../src/downloader-cli.cjs).
