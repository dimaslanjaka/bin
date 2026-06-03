---
applyTo: '**/*.{js,jsx,ts,tsx,mjs,cjs}'
---
# JS/TS Source Code Modification Instructions

When modifying JavaScript or TypeScript source code in this project:

## Scope Rules
- Modify files in `src/` only — never edit `lib/`, `dist/`, or `binaries/` (auto-generated)
- Keep changes minimal and localized to the requested feature/bug
- Only refactor broadly when: identical bugfix in 3+ places, function exceeds 200 lines, or code duplication >20%
- Preserve public APIs unless explicitly asked to change them
- Be a conservative maintainer — avoid breaking behavior

## Workflow
1. **Verify input**: Confirm target files exist or feature description is unambiguous
2. **Plan**: Read related modules, understand patterns, detect shared utilities
3. **Edit**: Apply changes to `src/` only; produce unified git-style diff + JSON summary
4. **Lint**: Run `eslint --fix <changed files>` — do not format manually
5. **TypeScript**: Run `tsc --noEmit` if tsconfig.json exists
6. **Memory**: Save a memory file to `.opencode/memory/<sanitized-filepath>.md` after edits

## Formatting Rules
- Never perform manual formatting decisions
- Always defer to `eslint --fix <changed files>`
- Do not block changes because of style warnings
- Prefer functional correctness over formatting perfection

## Safety Rules
- Never modify unrelated files
- Never rewrite architecture unnecessarily
- Never weaken existing types without reason
- Never introduce dead code
- Never silently remove backward compatibility
