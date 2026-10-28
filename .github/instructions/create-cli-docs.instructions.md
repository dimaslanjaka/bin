---
applyTo: 'docs-src/**'
---
# CLI Documentation Agent Instructions

When asked to create or update CLI documentation for commands or subcommands in this project:

1. Read the relevant existing markdown file in `docs-src/` and match its heading and example style.
2. Read aliases from `build.config.cjs`; run `yarn build` when the current generated mapping is missing or stale.
3. Analyze the CLI source file under `src/` (not `lib/` - lib is auto-generated).
4. Create or update the command-specific file in `docs-src/` and link to existing documentation instead of duplicating it.

Use the local documentation structure rather than introducing a new template. At minimum, include:

```markdown
# Title

description

## Usage

the usage description, including aliases

## Source

the link to source file on folder `src` (not folder `lib`).
```

**Important:** The `lib/` directory mirrors `src/` but is auto-generated (dist folder). Always link to `src/` sources.
