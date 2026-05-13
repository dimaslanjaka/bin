@echo off
setlocal
set SCRIPT_DIR=%~dp0

echo Running script: %~f0

python "%SCRIPT_DIR%..\bin\yarn-clean.py" %*
