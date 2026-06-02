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

## Source

See [`src/workflow-badge-cli.mjs`](../src/workflow-badge-cli.mjs) (CLI) and [`src/workflow-badge/generator.mjs`](../src/workflow-badge/generator.mjs) (SVG generator).
