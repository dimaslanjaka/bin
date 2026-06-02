# Workflow Badge

Generates a detailed SVG badge showing the status of the latest GitHub Actions workflow run. Displays workflow metadata, per-job step breakdown, and aggregated status counts — all in a polished card-style SVG suitable for embedding in READMEs, dashboards, or CI summary pages.

## Usage

```bash
workflow-badge [options]
```

### Aliases

This command is available under several aliases (all invoke the same CLI):

- `workflow-badge` (default)
- `wf-badge`
- `gh-status-badge`
- `actions-badge`

### Options

| Flag | Type | Description |
| :--- | :--- | :--- |
| `-o`, `--output` | `string` | Write SVG to file instead of stdout |
| `--owner` | `string` | GitHub repository owner (default: auto-detect from git remote) |
| `--repo` | `string` | GitHub repository name (default: auto-detect from git remote) |
| `--token` | `string` | GitHub access token (overrides `ACCESS_TOKEN` / `GITHUB_TOKEN` / `GH_TOKEN` env vars) |
| `--width` | `number` | SVG width in pixels (default: `520`) |
| `--max-steps` | `number` | Max steps to show per job (default: all). Use to keep badge compact |
| `-h`, `--help` | `boolean` | Show help message |

### Environment Variables

| Variable | Description |
| :------- | :---------- |
| `ACCESS_TOKEN` / `GITHUB_TOKEN` / `GH_TOKEN` | GitHub personal access token (required for API calls) |
| `GH_OWNER` | Override repository owner (optional) |
| `GH_REPO` | Override repository name (optional) |

### Examples

Preview badge in terminal (SVG printed to stdout):

```bash
workflow-badge
```

Save badge to file:

```bash
workflow-badge --output badge.svg
```

Save for a specific repository with custom width:

```bash
workflow-badge --owner dimaslanjaka --repo bin --output docs/workflow-status.svg --width 600
```

Keep the badge compact by limiting visible steps per job:

```bash
workflow-badge --max-steps 5 --output compact-badge.svg
```

### Output

The generated SVG is a card-style badge with:

- **Accent bar** — color-coded based on overall status (green = passing, red = failing, amber = in progress, grey = cancelled/pending)
- **Title section** — "Workflow Status" label with status pill
- **Metadata rows** — workflow name, status, branch, run ID
- **Jobs breakdown** — each job with its status, plus individual step rows with icons (✓ = passed, ✗ = failed, ◌ = pending, – = skipped)
- **Footer summary** — aggregated step counts

### PHP Backend

A PHP script is available at [`backend/workflow-badge.php`](../backend/workflow-badge.php) that serves the badge as a live image via HTTP. It spawns the Node CLI, captures the SVG output, and serves it with the correct `image/svg+xml` content type. The PHP backend requires the full project (with the CLI script under `src/` or `lib/`) to be deployed on the server — it does not fall back to a remote tarball.

**Requirements:**
- PHP 7.4+ with `proc_open` enabled
- The project's Node CLI script deployed on the server (`src/github-workflows/workflow-badge-cli.mjs` or `lib/github-workflows/workflow-badge-cli.cjs`)
- `ACCESS_TOKEN` (or `GITHUB_TOKEN` / `GH_TOKEN`) environment variable set on the server, or pass `&token=...` per request

**Usage as `<img>` tag:**

```html
<img src="https://your-domain.com/backend/workflow-badge.php?owner=dimaslanjaka&repo=bin" />
<!-- or using our server -->
<img src="http://sh.webmanajemen.com/php_backend/workflow-badge.php?owner=dimaslanjaka&repo=bin" />
```

![badge sample](http://sh.webmanajemen.com/php_backend/workflow-badge.php?owner=dimaslanjaka&repo=bin)

You can optionally add `&width=600`, `&max-steps=5`, or `&token=ghp_xxx` to customize the badge appearance or override the server's GitHub token for a single request.

The script validates all parameters before passing them to the Node CLI, separates `stdout` (SVG) from `stderr` (diagnostics) via `proc_open`, and returns appropriate HTTP error codes for invalid inputs or CLI failures.

## Source

See [`src/github-workflows/workflow-badge-cli.mjs`](../src/github-workflows/workflow-badge-cli.mjs) (CLI), [`src/github-workflows/workflow-badge-generator.mjs`](../src/github-workflows/workflow-badge-generator.mjs) (SVG generator), and [`backend/workflow-badge.php`](../backend/workflow-badge.php) (PHP backend).
