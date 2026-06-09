@echo off
setlocal

set "TARGET=tmp/.node_modules_delete_%RANDOM%%RANDOM%"

if not exist "node_modules\" (
  echo node_modules not found.
  exit /b 0
)

echo Renaming node_modules to %TARGET%...
ren "node_modules" "%TARGET%"

if errorlevel 1 (
  echo Failed. node_modules may be locked by Node, Bun, Yarn, npm, or VS Code.
  exit /b 1
)

echo Deleting in background...
start "" /b cmd /c rd /s /q "%CD%\%TARGET%"

echo Done.
exit /b 0