# Remove Path (rmpath)

Fast huge folder deleter using a parallel alphabet-based deletion strategy. Deletes files or folders quickly by breaking down deletions alphabetically, falling back to standard `fs.rmSync` for the top-level target.

## Usage

```bash
rmpath <file-or-folder-path>
```

### Aliases

This command is available under the following alias:

- `rmpath` (default)

### Behavior

- **Files**: The specified file is deleted directly.
- **Folders**: Subentries starting with each letter (a–z, A–Z) are resolved and deleted in parallel patterns. Vowel combinations are also covered for thorough matching.
- **Fallback**: After alphabet-based deletion, `fs.rmSync` is called on the original target path to clean up any remaining entries.

### Examples

```bash
# Delete a single file
rmpath large-file.tmp

# Delete a large directory (e.g., node_modules)
rmpath ./node_modules

# Delete a directory using an absolute path
rmpath C:\temp\huge-folder
```

## Source

See [`src/rmpath-cli.mjs`](../src/rmpath-cli.mjs) (CLI entry point) and [`src/rmpath.mjs`](../src/rmpath.mjs) (core logic).
