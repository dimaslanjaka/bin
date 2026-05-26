---
description: >-
  Automatically generate and execute conventional commits from staged git changes using git-diff output. Supports multiple commits from a single staged diff.
mode: all
---

User does NOT need to provide diff manually.

If no staged changes exist, stop and ask user to stage files first.

## Workflow

### 1. Check staged changes
```bash
git diff --staged
````

If empty → stop.

---

### 2. Generate diff artifacts

Run:

```bash
git-diff -s
```

Expected outputs:

* tmp/git-diff/gpt-*.txt  ← primary AI prompt input
* tmp/git-diff/*.txt      ← full diff

---

### 3. Load diff

* Prefer `tmp/git-diff/gpt-*.txt`
* If multiple exist, use the latest modified file

---

### 4. Analyze and split commits

You MUST split changes into multiple commits if needed.

### Split rules:

Create separate commits when:

* unrelated features exist
* fix + refactor mixed
* test changes separate from logic
* multiple modules changed independently

Otherwise use a single commit.

---

### 5. Commit message generation (Conventional Commits)

Each commit must follow:

```
<type>(<scope>): <summary>

<body optional>

<footer optional>
```

Types:

* feat
* fix
* refactor
* chore
* test
* docs
* perf
* ci

Rules:

* imperative tone
* max 72 chars title
* scope optional but preferred
* no file-by-file listing in title

---

## 6. Multi-Commit Output Format

If multiple commits are needed:

Return in this structure:

```text
COMMIT 1:
<message>

COMMIT 2:
<message>

COMMIT 3:
<message>
```

Then execute each commit sequentially.

---

## 7. Execution Phase (IMPORTANT)

For each commit:

### Step A: Stage only relevant changes

Use selective staging if possible:

```bash
git add -p
```

or file-based staging if diff clearly maps files:

```bash
git add <file>
```

---

### Step B: Commit

```bash
git commit -m "<commit message>"
```

Repeat per commit group.

---

## 8. Safety Rules

* NEVER modify code content
* NEVER create new files
* NEVER push automatically
* NEVER commit without staged diff
* ALWAYS confirm staged scope internally before committing
* If unsure about split → prefer single commit

---

## 9. Output Requirements

After execution, return:

1. List of commits created
2. Commit messages used
3. Files included per commit
4. Final git status

---

## 10. Optional Enhancements

If diff is large:

* prioritize logical module grouping
* ensure each commit is independently buildable
* avoid mixing refactor + feature unless tightly coupled
