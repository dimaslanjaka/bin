# Node Package Packer

Automated tarball (tgz) creator for release folder. It packs the current package, generates release metadata, and writes a release README alongside the produced tarballs.

## Usage

```bash
tarball-packer [options]
```

### One-off Call

You can run the command without installing the library:

```bash
npx --legacy-peer-deps -y binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz node-package-packer [options]
```

### Aliases

This command is available under the following aliases:

- `tarball-packer` (default)
- `node-package-packer`
- `pack-node-package`
- `pack-tarball`
- `build-tarball`
- `build-package`
- `build-package-tarball`

### Options

| Flag | Description |
| :--- | :--- |
| `-h`, `--help` | Show help message |
| `-y`, `--yarn` | Force `yarn pack` instead of `npm pack` |
| `-d`, `--verbose` | Enable verbose output |
| `--fn`, `--filename` | Set output filename variant |

### Description

- Runs `npm pack` or `yarn pack` to create a tarball in the project root.
- Copies the tarball into the release folder and writes `metadata.json` with integrity hashes.
- Generates a release README that lists available tarballs and raw GitHub URLs.

### Source

See [`src/node-package-packer-cli.mjs`](../src/node-package-packer-cli.mjs).