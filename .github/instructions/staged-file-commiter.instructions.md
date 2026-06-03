---
applyTo: '**'
---
# Staged Files Commit Instructions

When asked to create a commit from staged git changes:

## Workflow

### Step 1 — Capture Staged Diff
Run `git diff --staged` to capture all staged changes. Analyze the diff output thoroughly.

### Step 2 — Generate Conventional Commit Message
Format: `<type>(<scope>): <subject>`

**Allowed types:** build, ci, docs, feat, fix, perf, refactor, style, test, chore

**Subject rules:**
- Imperative mood, present tense ("add" not "added" or "adds")
- No capital first letter, no period at end
- ≤72 characters

**Body (optional):** Explain what changed and why, in imperative mood. Skip if subject is clear.

**Footer (optional):** Include `BREAKING CHANGE:` for breaking API changes, or `Closes #123` / `Fixes #456` for issue references.

### Step 3 — Save & Commit
1. Write the commit message to `commit.txt`
2. Run `git commit -F commit.txt`

## Rules
- Do NOT validate styling (let git hooks handle linting)
- Do NOT modify staged files — only analyze and commit
- Always follow conventional commit format strictly
- For breaking changes, always use `BREAKING CHANGE:` footer
- Match shell syntax to the active terminal

## Output
After committing, provide:
1. Commit SHA (first 7 chars)
2. Commit message echoed back
3. Files committed (count)
4. Next steps (e.g., "Ready to push")
