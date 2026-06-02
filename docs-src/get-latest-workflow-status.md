# Get Latest Workflow Status

Fetches and displays the latest GitHub Actions workflow run from the repository — showing the run name, status, conclusion, branch, and a full job-by-job breakdown with each step's result. Useful for quickly checking CI status from the terminal without opening a browser.

## Usage

```bash
get-latest-workflow-status [options]
```

### Aliases

This command is available under several names (all invoke the same CLI):

- `get-latest-workflow-status` (default)
- `get-latest-workflow`
- `latest-workflow`
- `wf-status`

### Options

| Flag | Type | Description |
| :--- | :--- | :--- |
| `--owner` | `string` | GitHub repository owner (default: auto-detect from git remote or `GH_OWNER` env) |
| `--repo` | `string` | GitHub repository name (default: auto-detect from git remote or `GH_REPO` env) |
| `--token` | `string` | GitHub access token (overrides `ACCESS_TOKEN` / `GITHUB_TOKEN` / `GH_TOKEN` env vars) |
| `-h`, `--help` | `boolean` | Show help message |

### Environment Variables

| Variable | Description |
| :------- | :---------- |
| `ACCESS_TOKEN` / `GITHUB_TOKEN` / `GH_TOKEN` | GitHub personal access token with `actions:read` scope (required) |
| `GH_OWNER` | Override repository owner (optional) |
| `GH_REPO` | Override repository name (optional) |

### Examples

Show the latest workflow run for the current repository:

```bash
get-latest-workflow-status
```

Show for a specific repository:

```bash
get-latest-workflow-status --owner dimaslanjaka --repo bin
```

Show help:

```bash
get-latest-workflow-status --help
```

### Output Example

```
==============================
🚀 Latest Workflow Run
==============================
Name      : Node.js Package Test
Status    : in_progress
Conclusion: null
Branch    : master
Run ID    : 26797771514
URL       : https://github.com/dimaslanjaka/bin/actions/runs/26797771514

==============================
🧩 Jobs & Steps
==============================

🧱 Job: 🔨 Build, Pack & Test
   Status: in_progress | Conclusion: null
   ✅ Set up job -> success (completed)
   ✅ ⬇️ Checkout workflow repository -> success (completed)
   ✅ ⬇️ Setup CI Environment -> success (completed)
   ⚪ 🧪 Run tests in test/example.test.cjs -> null (in_progress)
```

### How it works

1. **Authenticate** — Uses `ACCESS_TOKEN` / `GITHUB_TOKEN` / `GH_TOKEN` to call the GitHub API.
2. **Detect repository** — Owner and repo are auto-detected from the `git remote.origin.url`, or can be overridden with `--owner`/`--repo` flags or `GH_OWNER`/`GH_REPO` environment variables.
3. **Fetch latest run** — Calls `GET /repos/{owner}/{repo}/actions/runs?per_page=1` to get the most recent workflow run.
4. **Fetch jobs** — Calls `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs` to retrieve all jobs and their steps.
5. **Print report** — Renders a formatted terminal report with color-coded icons (✅ success, ❌ failure, ⏭️ skipped, ⚪ pending/in progress).

## Source

See [`src/github-workflows/get-latest-workflow-status-cli.mjs`](../src/github-workflows/get-latest-workflow-status-cli.mjs) (CLI entry) and [`src/github-workflows/get-latest-workflow-status.mjs`](../src/github-workflows/get-latest-workflow-status.mjs) (library module).
