## Git Diff Staged AI

Show git diff of staged files and generate a conventional commit message via AI (puter). Supports optional file filtering, model selection, and auto-commit.

### Usage

```bash
git-diff-staged-ai [options] [file]
```

### Aliases

This command is available under the following alias (invokes the same CLI):

- `git-diff-staged-ai` (default)

### Options

| Flag | Description |
| :--- | :---------- |
| `-h`, `--help` | Show help message |
| `--model=<name>` | Use a specific AI model (default: `claude-sonnet-4-6`) |
| `--commit` | Auto-commit with the AI-generated message |
| `<file>` | Show staged diff of a specific file |

### Examples

```bash
git-diff-staged-ai                      # Show staged diff + AI commit message
git-diff-staged-ai src/index.ts         # Show staged diff of specific file
git-diff-staged-ai --model=gpt-4o       # Use a different AI model
git-diff-staged-ai --commit             # Show staged diff + AI message + auto-commit
git-diff-staged-ai --help               # Show help message
```

### Output Files

| File | Description |
| :--- | :---------- |
| `tmp/git-diff-staged-ai/<hash>.txt` | Raw git diff output |
| `tmp/git-diff-staged-ai/gpt-<hash>.txt` | AI prompt for conventional commit generation |
| `tmp/git-diff-staged-ai/opencode-<hash>.txt` | OpenCode prompt helper |

### Notes

- AI commit message generation uses the **puter** provider (not ChatGPT) for reliable API-based access.
- When `--commit` is used, the AI-generated message is saved to `commit.txt`, `git commit -F commit.txt` is executed, and `commit.txt` is cleaned up afterward.
- The core library module (`git-diff-staged-ai.mjs`) is free of `process.exit()` and CLI arg parsing, making it testable with Jest.

### Source

See [`src/git/git-diff-staged-ai-cli.mjs`](../src/git/git-diff-staged-ai-cli.mjs) (CLI entry) and [`src/git/git-diff-staged-ai.mjs`](../src/git/git-diff-staged-ai.mjs) (core library).
