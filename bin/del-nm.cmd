@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%CD%"
set "TMP_DIR=%ROOT%\tmp"
set "TRASH=%TMP_DIR%\node_modules_trash"

set /a COUNT=0
set /a FAILED=0

echo Searching node_modules under:
echo %ROOT%
echo.

call :scan "%ROOT%"

if "%COUNT%"=="0" (
  echo No node_modules found.

  if exist "%TRASH%\" (
    echo Deleting tmp trash in background...
    start "" /b cmd /d /c rd /s /q "%TRASH%" ^>nul 2^>nul
  )

  exit /b 0
)

echo Moved %COUNT% node_modules folder(s).

if not "%FAILED%"=="0" (
  echo Failed %FAILED% folder(s).
)

echo Deleting tmp trash in background...
start "" /b cmd /c rd /s /q "%TRASH%"

echo Done.
exit /b 0


:scan
set "CURRENT=%~1"

for /d %%D in ("!CURRENT!\*") do (
  set "NAME=%%~nxD"
  set "FULL=%%~fD"

  if /i "!NAME!"=="tmp" (
    rem skip
  ) else if /i "!NAME!"=="dist" (
    rem skip
  ) else if /i "!NAME!"=="vendor" (
    rem skip
  ) else if /i "!NAME!"=="venv" (
    rem skip
  ) else if /i "!NAME!"==".venv" (
    rem skip
  ) else if /i "!NAME!"==".cache" (
    rem skip
  ) else if /i "!NAME!"=="node_modules" (
    if not exist "%TRASH%" mkdir "%TRASH%" >nul 2>&1

    set "TARGET=%TRASH%\.node_modules_delete_!RANDOM!!RANDOM!"

    echo Moving:
    echo !FULL!
    echo to:
    echo !TARGET!
    echo.

    move "!FULL!" "!TARGET!" >nul

    if errorlevel 1 (
      echo Failed: !FULL!
      echo.
      set /a FAILED+=1
    ) else (
      set /a COUNT+=1
    )
  ) else (
    call :scan "!FULL!"
  )
)

exit /b