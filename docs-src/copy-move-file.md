## Copy & Move File

Copies or moves files/directories via CLI.

### Usage

```bash
copy <src> <dest>
move <src> <dest>
````

### Behavior

* If `src` is a **file** and `dest` is a **directory**, the file will be placed inside that directory using its original filename.
* If `src` is a **file** and `dest` is a **file path**, it will be copied/moved directly to that path.
* If `src` is a **directory**, the entire directory will be copied/moved into the destination.

### Aliases

The copy command is available under several aliases (all invoke the same CLI):

* `copy` (default)
* `node-copy`
* `copy-file`

The move command is available under several aliases (all invoke the same CLI):

* `move` (default)
* `node-move`
* `move-file`

### Options

| Option       | Description       |
| ------------ | ----------------- |
| `-h, --help` | Show help message |

### Examples

```bash
# file → file
copy file.txt backup/file.txt
move file.txt backup/file.txt

# file → directory (auto-append filename)
copy file.txt backup/
move file.txt backup/

# directory → directory
copy ./src ./dist
move ./src ./dist
```

### Source

See [`src/file/copy-cli.mjs`](../src/file/copy-cli.mjs) and [`src/file/move-cli.mjs`](../src/file/move-cli.mjs).