---
applyTo: 'docs-src/**'
---
# CLI Documentation Agent Instructions

When asked to create or update CLI documentation for commands or subcommands in this project:

1. Run `yarn run build` first to generate `lib/` and `tmp/bin-mapping.json`
2. Read aliases from `build.config.cjs` (defaultBin object) and `tmp/bin-mapping.json`
3. Read existing markdown files in `docs-src/` to understand documentation patterns
4. Analyze the CLI source file under `src/` (not `lib/` - lib is auto-generated)
5. Create documentation in `docs-src/` following this structure:

```markdown
# Title

description

# Usage

the usage description, including aliases

# Source

the link to source file on folder `src` (not folder `lib`).
```

**Important:** The `lib/` directory mirrors `src/` but is auto-generated (dist folder). Always link to `src/` sources.
