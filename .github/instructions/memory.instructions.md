---
applyTo: '**'
---

# Memory Instructions

Memory files persist agent knowledge across sessions. They follow Letta-compatible memory block format.

## Location & Naming

Memory files are stored at:

```
.opencode/memory/<sanitized-filepath>.md
```

The sanitized filepath replaces path separators with `_`:

- `src/utils/parser.ts` → `src_utils_parser.ts.md`
- `test/git-diff.test.cjs` → `test_git-diff.test.cjs.md`

## Format

Every memory file must use YAML frontmatter with these fields:

```markdown
---
description: Records modifications made to src/utils/parser.ts
label: src_utils_parser.ts
limit: 5000
read_only: false
---
Short explanation of modifications.
Why the change was needed.
- added parser normalization
- removed duplicate extension logic
- improved fallback handling
```

### Fields

| Field | Description |
|---|---|
| `description` | Accurately describes the block's purpose. The agent uses this to decide how to read/write to the block. Make it descriptive but concise. |
| `label` | Unique identifier for the block. Use the sanitized filepath (path separators replaced with `_`). |
| `limit` | Character size limit for the block. Default: `5000`. |
| `read_only` | Whether the agent can update this block. Default: `false`. Set to `true` for reference-only knowledge. |

### Importance of `description`

The `description` field is critical — it's the primary signal the agent uses to determine how to read and write to the block. A poor description leads to the agent misusing or ignoring the block.

Good: `Records modifications made to src/git/git-purge.cjs`
Bad: `Memory for file`

See: https://docs.letta.com/guides/core-concepts/memory/memory-blocks#the-importance-of-the-description-field

## Content Guidelines

- Write the memory content after the `---` frontmatter close
- Use plain prose or bullet points — no additional heading wrappers needed
- Include: what changed, why, and any migration/compatibility notes
- Keep within the `limit` character budget (default 5000)

## Rules

1. Save memory to `.opencode/memory/<sanitized-path>.md` after every modification
2. Always generate the `label` by replacing `/` and `\` with `_` in the source filepath
3. The `description` must accurately describe the block's purpose — be specific
4. Do not include emojis in memory files unless explicitly requested
5. If writing a memory file fails, surface the error clearly
