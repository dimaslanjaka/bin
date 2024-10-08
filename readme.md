# binary helper collections
binary helper collections by L3n4r0x

## installation

clone direct folder
```bash
git clone -b master https://github.com/dimaslanjaka/bin bin
```

via npm
```bash
npm install binary-collections
# or install as global package
npm install binary-collections -g
# or
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

submodule remover

![image](https://github.com/user-attachments/assets/659c2fa3-f12f-45cb-a66f-aed3807e0023)


### npm scripts runner

> binaries: `nrs`, `run-s`, `run-series`

| arg | description |
| :--- | :--- |
| `--yarn` | using `yarn run <script-name>` |
| `--verbose` `-v` | using `yarn run <script-name>` |

example: `npm run namescript`

```json
{
  "name": "package-name",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "namescript:xx": "echo xx",
    "namescript:xxx": "echo xxx",
    "namescript:xxxx": "echo xxxx",
    "namescript:xxxxx": "echo xxxxx",
    "namescript": "nrs --yarn=true --verbose=true \"namescript:**\""
  },
  "license": "ISC"
}
```

## node_modules cleaner

```bash
del-nodemodules
```

![image](https://github.com/dimaslanjaka/bin/assets/12471057/f03e5b51-1808-4e82-a474-0dd3c7eab5fe)

## yarn caches cleaner

```bash
del-yarncaches
```

## gradle caches cleaner

- delete gradle build folder

```bash
del-gradle
```

## Git purge

- prune reflogs from all git repositories

```bash
git-purge
```

![image](https://github.com/dimaslanjaka/bin/assets/12471057/2805c54e-28a7-491d-b381-de2593a854b3)

## troubleshooting
### submodule-install

when you're facing error like
```log
fatal: 'origin/<branch>' is not a commit and a branch '<branch>' cannot be created from it
fatal: unable to checkout submodule '<folder>/<submodule>'
```

solution: deleting `.git/modules` before execute `submodule-install`.

example single execution:
```bash
echo "init submodules"
git submodule init
git submodule foreach "git submodule init"
echo "sync submodules"
git submodule sync
git submodule foreach "git submodule sync"
echo "update submodules"
mkdir -p bin >/dev/null 2>&1
curl -L https://github.com/dimaslanjaka/bin/raw/master/bin/submodule-install > bin/submodule-install
rm -rf .git/modules
bash ./bin/submodule-install
```
