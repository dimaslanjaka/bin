## GitHub Actions Cache Cleaner

Removes outdated GitHub Actions caches in the current repository, keeping only the newest cache for each prefix. Ensures safe cleanup by retaining the latest cache per group and authenticates using tokens from your .env file.

### Usage

```bash
# use npx
npx --yes binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz clean-github-actions-caches

# use yarn dlx
yarn dlx binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz clean-github-actions-caches

# keep the first 3 cache key segments as the grouping prefix
clean-github-actions-caches --prefix-depth 3
```

### Aliases

This command is available under several aliases (all invoke the same CLI):

- `clean-github-actions-cache`
- `clear-github-actions-cache`
- `clear-github-actions-caches`
- `clear-gh-caches`


### Features
- Authenticates using `ACCESS_TOKEN` or `GITHUB_TOKEN` from your `.env` file
- Groups caches by the first N key segments split on `-` or `_` and deletes all but the latest for each group
- Operates on the current repository (origin remote) and matches the working directory of your terminal
- Safe: Only deletes caches older than the most recent per prefix
- Accepts `--repo owner/repo` to target a specific repository and `--prefix-depth <n>` to control grouping

### Environment Setup
1. Add `ACCESS_TOKEN` or `GITHUB_TOKEN` to your `.env` file
2. Ensure you have access to the repository's cache management

### Source
See [`src/github-workflows/clean-github-actions-caches.cjs`](../src/github-workflows/clean-github-actions-caches.cjs) & [`src/github-workflows/clean-github-actions-caches-cli.cjs`](../src/github-workflows/clean-github-actions-caches-cli.cjs)

### Github CI Examples

```yaml
name: Clean GitHub Actions Cache

on:
  # Trigger this workflow when the specified workflows complete (e.g., after build and test workflows)
  workflow_run:
    workflows:
      - Node.js Package Build
      - Node.js Package Test
    types:
      - completed

  # Allow manual triggering of this workflow from the GitHub Actions UI
  workflow_dispatch:

  # Uncomment the following lines to enable scheduled cache cleaning (e.g., every hour)
  # schedule:
  #   - cron: '0 * * * *'

  # Uncomment the following lines to enable cache cleaning on pushes to the master branch
  # push:
  #   branches:
  #     - master

  # Allow this workflow to be called by other workflows, passing the ACCESS_TOKEN secret
  workflow_call:
    secrets:
      ACCESS_TOKEN:
        required: true

concurrency:
  group: clean-cache
  cancel-in-progress: true

jobs:
  clean-cache:
    # if: contains(github.repository, 'php-proxy-hunter')
    runs-on: windows-latest

    env:
      PIP_CACHE_DIR: "${{ github.workspace }}/project/tmp/pip"
      NUITKA_CACHE_DIR: "${{ github.workspace }}/project/tmp/nuitka-cache"
      NODE_OPTIONS: "--max_old_space_size=4096"
      YARN_ENABLE_IMMUTABLE_INSTALLS: false
      ACCESS_TOKEN: ${{ secrets.ACCESS_TOKEN || secrets.GITHUB_TOKEN }}
      GH_TOKEN: ${{ secrets.ACCESS_TOKEN || secrets.GITHUB_TOKEN }}
      YARN_CHECKSUM_BEHAVIOR: update

    steps:
      - name: 📥 Checkout Repository
        uses: actions/checkout@v6
        with:
          token: ${{ secrets.ACCESS_TOKEN || secrets.GITHUB_TOKEN }}

      - name: 🐍 Setup Python
        uses: actions/setup-python@v6
        with:
          python-version: "3.11"
          architecture: "x64"

      - name: 🟢 Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 20.x

      - name: 🧹 Clean GitHub Actions Cache ${{ github.event.workflow_run.head_sha }}
        env:
          GH_TOKEN: ${{ secrets.ACCESS_TOKEN || secrets.GITHUB_TOKEN }}
        run: |
          npx --legacy-peer-deps -y binary-collections@https://raw.githubusercontent.com/dimaslanjaka/bin/master/releases/bin.tgz clean-github-actions-caches --repo ${{ github.repository }} --sha ${{ github.event.workflow_run.head_sha }}
        shell: bash
```