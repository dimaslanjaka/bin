# binary helper collections
binary helper collections by L3n4r0x

## installation

clone direct folder
```bash
git clone -b master https://github.com/dimaslanjaka/bin bin
```

via npm
```bash
npm install binary-collections@git+https://github.com/dimaslanjaka/bin.git
# or
npm install binary-collections@https://github.com/dimaslanjaka/bin/raw/master/releases/bin.tgz
```

## Setup vscode
create `.vscode/settings.json`
```jsonc
{
  "terminal.integrated.env.linux": {
    "PATH": "${env:PATH}:${workspaceFolder}/node_modules/.bin:${workspaceFolder}/bin"
  },
  "terminal.integrated.env.windows": {
    "PATH": "${env:PATH};${workspaceFolder}\\node_modules\\.bin;${workspaceFolder}\\bin"
  },
  "terminal.integrated.profiles.windows": {
    "PowerShell": {
      "source": "PowerShell",
      "icon": "terminal-powershell"
    },
    "Command Prompt": {
      "path": [
        "${env:windir}\\Sysnative\\cmd.exe",
        "${env:windir}\\System32\\cmd.exe"
      ],
      "args": [],
      "icon": "terminal-cmd"
    },
    "Git Bash": {
      "source": "Git Bash"
    },
    "Cygwin": {
      "path": "C:\\cygwin64\\bin\\bash.exe",
      "args": [
        "--login",
        "-i"
      ],
      "env": {
        "CHERE_INVOKING": "1"
      }
    }
  },
  "terminal.integrated.defaultProfile.windows": "Command Prompt",
}
```

## Usages

see all binary at
- https://github.com/dimaslanjaka/bin/tree/master/bin
- https://github.com/dimaslanjaka/bin/tree/master/lib
- https://github.com/dimaslanjaka/bin/blob/master/package.json