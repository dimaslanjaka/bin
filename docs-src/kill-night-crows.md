## Night Crows Process Killer

Kills the Night Crows game launcher process tree when the shipping process hangs.

### Usage

```bash
kill-night-crows
```

### Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help message |

### Description

- Launches `kill-night-crows.ps1` PowerShell script
- Watches for Night Crows processes and kills the launcher tree
- **Windows only**
- Available as a standalone utility for game development environments

### Source

See [`src/kill-night-crows.mjs`](../src/kill-night-crows.mjs) & [`bin/kill-night-crows.ps1`](../bin/kill-night-crows.ps1).
