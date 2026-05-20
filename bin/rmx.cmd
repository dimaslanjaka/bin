@echo off
setlocal

set "SCRIPT_DIR=%~dp0"

where bash >nul 2>&1
if errorlevel 1 (
    echo Error: bash not found in PATH.
    exit /b 1
)

bash "%SCRIPT_DIR%rmx" %*