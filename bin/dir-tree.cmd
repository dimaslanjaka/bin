@echo off
setlocal
set SCRIPT_DIR=%~dp0
node "%SCRIPT_DIR%..\src\print-directory-tree.cjs" %*
