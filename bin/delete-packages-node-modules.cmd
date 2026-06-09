@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM If script is called as worker, jump to worker mode.
if /i "%~1"=="--worker" goto :worker

REM Folder to scan.
set "ROOT=packages"

REM Maximum parallel delete jobs.
set "MAX_WORKERS=4"

REM Force Windows native find.exe, avoiding Git/MSYS find conflict.
set "WIN_FIND=%SystemRoot%\System32\find.exe"

REM Temporary folder for lock files.
set "LOCKDIR=%TEMP%\node_modules_delete_locks_%RANDOM%_%RANDOM%"

if not exist "%ROOT%\" (
    echo Folder "%ROOT%" not found.
    exit /b 1
)

mkdir "%LOCKDIR%" >nul 2>nul

echo Parallel deleting %ROOT%/**/node_modules...
echo Max workers: %MAX_WORKERS%
echo.

set /a JOB=0

for /d /r "%ROOT%" %%D in (node_modules) do (
    if exist "%%D\" (
        call :waitForSlot

        set /a JOB+=1
        set "LOCKFILE=%LOCKDIR%\job-!JOB!.lock"

        >"!LOCKFILE!" echo running

        echo [!JOB!] Deleting: %%D

        start "" /b "%ComSpec%" /c call "%~f0" --worker "%%D" "!LOCKFILE!"
    )
)

call :waitAll

rmdir "%LOCKDIR%" >nul 2>nul

echo.
echo Done. All delete jobs finished.
exit /b 0


:waitForSlot
set "ACTIVE=0"

for /f %%C in ('dir /b "%LOCKDIR%\*.lock" 2^>nul ^| "%WIN_FIND%" /c /v ""') do (
    set "ACTIVE=%%C"
)

if !ACTIVE! GEQ %MAX_WORKERS% (
    timeout /t 1 /nobreak >nul
    goto :waitForSlot
)

exit /b 0


:waitAll
set "ACTIVE=0"

for /f %%C in ('dir /b "%LOCKDIR%\*.lock" 2^>nul ^| "%WIN_FIND%" /c /v ""') do (
    set "ACTIVE=%%C"
)

if !ACTIVE! GTR 0 (
    timeout /t 1 /nobreak >nul
    goto :waitAll
)

exit /b 0


:worker
setlocal

REM Target node_modules folder.
set "TARGET=%~2"

REM Lock file for this worker.
set "LOCKFILE=%~3"

rmdir /s /q "%TARGET%" 2>nul

del /q "%LOCKFILE%" 2>nul

exit /b 0