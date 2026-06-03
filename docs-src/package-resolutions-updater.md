## Package Resolutions Manager

Updates GitHub raw tarball commit SHAs in `package.json` resolutions to the latest commit on each branch.

### Aliases

- `pkg-resolutions-updater` (default)
- `pkg-res-updater`

### Usage

```bash
pkg-resolutions-updater
```

### Description

Scans `package.json` resolutions for GitHub tarball URLs (raw.githubusercontent.com) and updates the commit SHA in each URL to the latest commit on the referenced branch.

### Source

See [`src/package-resolutions-updater-cli.mjs`](../src/package-resolutions-updater-cli.mjs).
