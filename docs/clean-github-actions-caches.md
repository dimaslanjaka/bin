## GitHub Actions Cache Cleaner

Removes outdated GitHub Actions caches in the current repository, keeping only the newest cache for each prefix. Ensures safe cleanup by retaining the latest cache per group and authenticates using tokens from your .env file.

### Usage

```bash
# use npx
npx --yes binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz clean-github-actions-caches

# use yarn dlx
yarn dlx binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz clean-github-actions-caches
```

### Features
- Authenticates using `ACCESS_TOKEN` or `GITHUB_TOKEN` from your `.env` file
- Groups caches by prefix and deletes all but the latest for each group
- Operates on the current repository (origin remote) and matches the working directory of your terminal
- Safe: Only deletes caches older than the most recent per prefix

### Environment Setup
1. Add `ACCESS_TOKEN` or `GITHUB_TOKEN` to your `.env` file
2. Ensure you have access to the repository's cache management

### Source
See [`src/clean-github-actions-caches.cjs`](../src/clean-github-actions-caches.cjs)