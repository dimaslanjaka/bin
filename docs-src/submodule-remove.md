## Submodule Remove

Completely removes a git submodule from the repository.

### Usage

```bash
submodule-remove <submodule-path>
```

### Description

Performs a complete removal of a git submodule:
- De-initializes the submodule (`git submodule deinit`)
- Removes the submodule from `.gitmodules`
- Removes the submodule from `.git/config`
- Removes the submodule directory
- Commits the changes

### Source

See [`src/submodule-remove.cjs`](../src/submodule-remove.cjs) & [`src/submodule-remove-cli.js`](../src/submodule-remove-cli.js)
