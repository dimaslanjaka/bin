# Session Title Reasoner

CLI tool that reads OpenCode sessions whose title is still `"New session"`, extracts their conversation transcript, and uses an LLM to propose (or write) a more descriptive title.

## Usage

```bash
session-title-reasoner [options]
```

### Options

| Flag | Type | Description |
| :--- | :--- | :--- |
| `--write` | boolean | Write the proposed titles back to the database (default: dry-run) |
| `--limit <n>` | number | Process at most N sessions (default: all) |
| `--dir <substr>` | string | Only sessions whose working directory contains this substring |
| `--model <name>` | string | AI model to use (default: `deepseek-v4-flash-free`) |
| `--concurrency <n>` | number | Parallel LLM requests (default: 3) |
| `-h`, `--help` | boolean | Show help message |

### Examples

Dry-run — print proposed titles without modifying the database:

```bash
session-title-reasoner
```

Write titles back to the database:

```bash
session-title-reasoner --write
```

Process at most 5 sessions:

```bash
session-title-reasoner --limit 5 --write
```

Filter to a specific project directory:

```bash
session-title-reasoner --dir my-project --write
```

Use a specific model with higher concurrency:

```bash
session-title-reasoner --model deepseek-v3-free --concurrency 5 --write
```

### How it works

1. **Load**: Queries the OpenCode SQLite database (`~/.local/share/opencode/opencode.db`) for sessions whose title starts with `"New session"`.
2. **Filter**: Optionally narrows to sessions matching the `--dir` substring and caps the result with `--limit`.
3. **Transcript**: For each session, loads all messages and their parts, then assembles a conversation transcript (user/assistant turns, skipping tool calls).
4. **LLM**: Sends the transcript to an OpenAI-compatible API (configured via project config or environment) and asks it to reason about what the session was about, then propose a concise title.
5. **Output**: Prints proposed titles alongside brief reasoning for every session.
6. **Write** (opt-in): When `--write` is given, updates the session `title` in the database.

Concurrency is respected — sessions are processed in batches of `--concurrency` parallel LLM requests.

### Requirements

An OpenAI-compatible API key must be configured. Add an `opencode.keys` array to your [project config](../readme.md#configuration):

```js
// binary-collections.config.js
export default {
  opencode: {
    keys: [
      { name: 'primary', key: 'sk-xxxxxx' }
    ]
  }
};
```

## Source

See [`src/opencode/session-title-reasoner-cli.ts`](../src/opencode/session-title-reasoner-cli.ts).
