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
| `--normalize-resolutions` | Replace pinned commit hashes in `resolutions` with branch names before packing, then restore the original `package.json` after |

### Description

- Runs `npm pack` or `yarn pack` to create a tarball in the project root.
- Copies the tarball into the release folder and writes `metadata.json` with integrity hashes.
- Generates a release README that lists available tarballs and raw GitHub URLs.

### Normalize Resolutions (`--normalize-resolutions`)

When the `--normalize-resolutions` flag is passed, the packer runs an extra
pre/post step around the pack command:

1. **Before pack** — Reads `package.json` resolutions, replaces pinned commit
   hashes (e.g. `/raw/<40-char-hex>/`) with friendly branch/tag names using
   mappings from config (`binary-collections.config.js`) or built-in defaults.
2. **Pack** — Runs the normal pack flow (including workspace protocol
   transformation).
3. **After pack** — Restores the original `package.json` from a backup stored
   under `tmp/normalize-resolutions/`.

This is useful when your `resolutions` field pins dependencies by commit hash
but you want the packed tarball to reference branch names instead.

To customize which packages are normalized and what branch/tag name they resolve to,
create a `binary-collections.config.js` (or `.cjs`/`.mjs`) in your project root with a
`normalizeResolutions` array. See the
[example config file](https://github.com/dimaslanjaka/bin/blob/4ded256ce94e6bacc78ef2a02afc5ae837437b02/binary-collections.config-example.js#L15-L22)
for the expected format.

### Source

- CLI entry: [`src/node-package-packer-cli.mjs`](../src/node-package-packer-cli.mjs)
- Resolution normalizer: [`src/node-package-packer/normalize-resolutions.mjs`](../src/node-package-packer/normalize-resolutions.mjs)