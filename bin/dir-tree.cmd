@echo off
setlocal
set SCRIPT_DIR=%~dp0

echo Running script: %~f0

node "%SCRIPT_DIR%..\lib\print-directory-tree.cjs" %*
