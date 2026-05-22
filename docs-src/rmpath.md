## Fast Folder Deleter

Fast huge folder deleter using parallel alphabet-based deletion strategy.

### Usage

```bash
rmpath <file-or-folder-path>
```

### Description

- Deletes files or folders quickly by breaking down deletions alphabetically
- For folders, resolves subfolders starting with each letter and deletes them in parallel patterns
- Falls back to standard `fs.rmSync` for the top-level target

### Source

See [`src/rmpath.mjs`](../src/rmpath.mjs) & [`bin/rmpath`](../bin/rmpath)
