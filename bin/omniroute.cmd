@echo off
setlocal enabledelayedexpansion

set "NODE_OPTIONS=--max-old-space-size=6048 --expose-gc --max-semi-space-size=512"
set "NODE_ENV=production"

set "NPM_ROOT=%TEMP%\npm"
set "PKG_DIR=%NPM_ROOT%\node_modules\omniroute"
set "VERSION_FILE=%NPM_ROOT%\omniroute.version"
set "FLAVOR_FILE=%NPM_ROOT%\omniroute-flavor.txt"
set "FLAVOR=prod"

if not exist "%NPM_ROOT%" mkdir "%NPM_ROOT%"

REM --- Fetch latest metadata ---
set "REMOTE_VERSION="
set "REMOTE_URL="

for /f "usebackq tokens=1,2 delims=|" %%a in (`powershell -NoProfile -Command "try { $j = Invoke-RestMethod -Uri 'https://registry.npmjs.org/omniroute/latest' -TimeoutSec 15; Write-Output ($j.version + [char]124 + $j.dist.tarball) } catch { }"`) do (
    set "REMOTE_VERSION=%%a"
    set "REMOTE_URL=%%b"
)

if not defined REMOTE_VERSION (
    echo [npm] Failed to fetch registry metadata
    exit /b 1
)
if not defined REMOTE_URL (
    echo [npm] Registry returned no tarball URL
    exit /b 1
)

set "TARBALL=%NPM_ROOT%\omniroute-!REMOTE_VERSION!.tgz"

echo [npm] Latest version: !REMOTE_VERSION!

REM --- Check cache ---
set "NEED_SETUP=1"
set "LOCAL_VERSION="
set "STORED_FLAVOR="

if exist "!VERSION_FILE!" (
    for /f "usebackq delims=" %%a in ("!VERSION_FILE!") do set "LOCAL_VERSION=%%a"
    if "!LOCAL_VERSION!"=="!REMOTE_VERSION!" (
        if exist "!PKG_DIR!\package.json" (
            echo [npm] Cached version valid, skipping setup.
            set "NEED_SETUP=0"
        ) else (
            echo [npm] Cache incomplete, re-setup required.
        )
    ) else (
        echo [npm] Version changed: !LOCAL_VERSION! to !REMOTE_VERSION!
    )
) else (
    echo [npm] No version file found
)

REM --- Check flavor ---
if exist "!FLAVOR_FILE!" (
    for /f "usebackq delims=" %%b in ("!FLAVOR_FILE!") do set "STORED_FLAVOR=%%b"
    if not "!STORED_FLAVOR!"=="!FLAVOR!" (
        echo [npm] Flavor changed from !STORED_FLAVOR! to !FLAVOR!, forcing rebuild.
        set "NEED_SETUP=1"
    )
) else (
    echo [npm] No flavor file found, forcing rebuild.
    set "NEED_SETUP=1"
)

if "!NEED_SETUP!"=="1" (
    echo [npm] Downloading tarball...
    curl -fL "!REMOTE_URL!" -o "!TARBALL!.tmp"
    if errorlevel 1 (
        del "!TARBALL!.tmp" 2>nul
        exit /b 1
    )
    move /y "!TARBALL!.tmp" "!TARBALL!" >nul

    pushd "%NPM_ROOT%"

    if not exist "package.json" (
        echo [npm] Initializing project...
        call npm init -y
    )

    if exist "node_modules\omniroute" rmdir /s /q "node_modules\omniroute" 2>nul

    echo [npm] Installing omniroute...
    call npm install "!TARBALL!" ^
        --legacy-peer-deps ^
        --no-audit ^
        --no-fund ^
        --loglevel=error
    if errorlevel 1 (
        popd
        echo [npm] Install failed
        exit /b 1
    )

    echo [npm] Approving scripts...
    call npx -y npm-approve-scripts better-sqlite3 2>nul || ver>nul

    echo [npm] Rebuilding native modules...
    call npm rebuild better-sqlite3
    if errorlevel 1 (
        popd
        echo [npm] Rebuild failed
        exit /b 1
    )

    popd

    <nul set /p "=!FLAVOR!" > "!FLAVOR_FILE!"
    echo.>> "!FLAVOR_FILE!"
    <nul set /p "=!REMOTE_VERSION!" > "!VERSION_FILE!"
    echo.>> "!VERSION_FILE!"
    echo [npm] Setup complete.
)

REM --- Resolve entry point ---
set "ENTRY="
set "ENTRY_REL="

pushd "%PKG_DIR%"
for /f "usebackq tokens=*" %%i in (`node -p "const p=require('./package.json'); typeof p.bin==='string'?p.bin:(p.bin?Object.values(p.bin)[0]:'')"`) do (
    set "ENTRY_REL=%%i"
)
popd

if defined ENTRY_REL (
    set "ENTRY=!PKG_DIR!\!ENTRY_REL!"
)

if not defined ENTRY (
    if exist "!PKG_DIR!\bin\omniroute.mjs" set "ENTRY=!PKG_DIR!\bin\omniroute.mjs"
    if exist "!PKG_DIR!\bin\omniroute.js" set "ENTRY=!PKG_DIR!\bin\omniroute.js"
    if exist "!PKG_DIR!\dist\index.js" set "ENTRY=!PKG_DIR!\dist\index.js"
    if exist "!PKG_DIR!\dist\cli.js" set "ENTRY=!PKG_DIR!\dist\cli.js"
)

if not defined ENTRY (
    echo [npm] Entry point not found.
    exit /b 1
)

node "!ENTRY!" %*