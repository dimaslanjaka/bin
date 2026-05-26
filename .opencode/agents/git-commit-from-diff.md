---
description: >-
  Automatically generate and execute conventional commits from staged git changes using git-diff output. Supports multiple commits from a single staged diff.
mode: all
---

User does NOT need to provide diff manually.

If no staged changes exist, stop and ask user to stage files first.

## Workflow

### 1. Check staged changes

Run:

```bash
git diff --staged
````

If staged diff is empty:

* stop immediately
* ask user to stage files first

Never create commits without staged changes.

---

## 2. Generate diff artifacts

Run:

```bash
git-diff -s
```

Expected outputs:

* `tmp/git-diff/*.txt`
* `tmp/git-diff/gpt-*.txt`
* `tmp/git-diff/opencode-*.txt`

Prefer:

* `tmp/git-diff/gpt-*.txt`

If multiple files exist:

* use the latest modified file

---

## 3. Load and analyze diff

Analyze:

* changed files
* modules/scopes
* feature additions
* fixes
* refactors
* tests
* tooling changes
* documentation updates

Determine:

* commit type
* commit scope
* whether multiple commits are required

---

## 4. Commit splitting rules

Split into multiple commits when:

* unrelated features exist
* fixes and refactors are mixed
* tests are separate from implementation
* tooling changes are independent
* multiple modules changed independently
* docs changes are unrelated

Prefer:

* logically isolated commits
* independently buildable commits
* clean history

If uncertain:

* prefer a single commit

---

## 5. Conventional Commit Rules

Every commit MUST follow Conventional Commits.

Allowed types:

* feat
* fix
* refactor
* chore
* test
* docs
* perf
* ci

Scope:

* optional but preferred
* use module/folder/package name if clear

Examples:

```text
feat(cli): add recursive cleanup support
fix(proxy): resolve invalid timeout handling
refactor(parser): simplify token normalization
```

---

## 6. Commit Message Requirements

The agent MUST generate:

1. Commit title
2. Commit body (required unless trivial)
3. Optional footer

Structure:

```text
<type>(<scope>): <summary>

Why:
- explain motivation

Changes:
- summarize key modifications
- summarize architectural updates

Impact:
- mention breaking changes or migration notes if applicable
```

Rules:

* imperative mood
* title under 72 chars
* no file-by-file dump
* summarize intent, not implementation noise

The body is REQUIRED when:

* multiple files changed
* feature affects behavior
* refactor exists
* build/tooling changes exist
* tests changed
* more than 20 lines changed
* architecture affected

Avoid title-only commits except:

* typo fixes
* comments only
* tiny docs changes

---

## 7. Multi-Commit Output Format

If multiple commits are required:

```text
COMMIT 1:
<title>

<body>

COMMIT 2:
<title>

<body>
```

Each commit MUST include:

* title
* body if non-trivial

---

## 8. Execution Phase

### Step A: Stage relevant changes

Use selective staging when splitting commits.

Preferred:

```bash
git add <files>
```

Optional:

```bash
git add -p
```

Only include relevant files per commit.

---

### Step B: Commit

NEVER use:

```bash
git commit -m "<full multiline message>"
```

because many environments truncate multiline content.

Instead:

### Title only commit

```bash
git commit -m "docs(readme): fix typo"
```

### Commit with body

Use multiple `-m` arguments:

```bash
git commit \
  -m "feat(cli): add recursive cleanup support" \
  -m "Why:
- support nested cleanup execution

Changes:
- add recursive traversal
- improve cleanup logging
- normalize ignore handling

Impact:
- cleanup now processes nested directories automatically"
```

### Breaking change example

```bash
git commit \
  -m "feat(api): redesign parser interface" \
  -m "Why:
- simplify plugin integration

Changes:
- refactor parser lifecycle
- rename parser hooks
- simplify initialization flow

Impact:
- existing plugins require migration

BREAKING CHANGE: parser hooks renamed"
```

Rules:

* first `-m` = title
* second `-m` = body
* third `-m` optional = footer
* preserve paragraphs
* preserve blank lines
* body should exist for non-trivial commits

---

## 9. Style & Validation Rules

* NEVER manually verify formatting style
* NEVER debate formatting choices
* Prefer automated fixes only

After staging or before final commit if needed:

```bash
eslint --fix src
```

Optional TypeScript validation:

```bash
tsc --noEmit
```

Do not block commits because of style-only warnings.

---

## 10. Safety Rules

* NEVER modify unrelated files
* NEVER push automatically
* NEVER rewrite git history
* NEVER amend commits automatically
* NEVER commit unstaged changes
* NEVER create empty commits
* NEVER touch `lib/` directly unless explicitly requested

Assume:

* `src/` = source of truth
* `lib/` = generated output

---

## 11. Final Output Requirements

After commits complete, return:

1. Created commit list
2. Commit messages used
3. Files included per commit
4. Final git status summary

Example:

```text
Created commits:

1.
feat(cli): add recursive cleanup support

2.
fix(parser): normalize extension detection

Final status:
working tree clean
```

```