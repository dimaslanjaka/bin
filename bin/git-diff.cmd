@echo off
set SCRIPT_DIR=%~dp0
set SRC_DIR=%SCRIPT_DIR%..\src
node "%SRC_DIR%\git-diff.cjs" %*
