## Submodule Token Manager

Removes access tokens from git submodule URLs.

### Usage

```bash
submodule-token
```

### Description

Scans submodule URLs in `.gitmodules` and removes any embedded access tokens, leaving clean HTTPS URLs.

### Source

See [`bin/submodule-token`](../bin/submodule-token)
