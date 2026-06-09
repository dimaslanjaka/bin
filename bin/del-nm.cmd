@echo off
setlocal

if not exist "node_modules" (
  echo node_modules not found in current folder.
  pause
  exit /b 0
)

set "TARGET=%TEMP%\node_modules_delete_%RANDOM%"

echo Moving node_modules to:
echo %TARGET%

move "node_modules" "%TARGET%"

echo Done. node_modules moved.
echo Deleting in background...
start /b cmd /c rd /s /q "%TARGET%"

pause