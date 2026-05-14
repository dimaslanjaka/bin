@echo off
setlocal enabledelayedexpansion

REM Get directory of this .bat file
set "SCRIPT_DIR=%~dp0"

echo Current file path: %~f0

set "TARGET="

set "CANDIDATE1=%SCRIPT_DIR%..\bin\yarn-clean.py"
set "CANDIDATE2=%SCRIPT_DIR%..\binaries\yarn-clean.py"

if exist "%CANDIDATE1%" (
    set "TARGET=%CANDIDATE1%"
) else if exist "%CANDIDATE2%" (
    set "TARGET=%CANDIDATE2%"
)

if "%TARGET%"=="" (
    echo Error: yarn-clean.py not found in expected locations:
    echo  - %CANDIDATE1%
    echo  - %CANDIDATE2%
    exit /b 1
)

echo Using script: %TARGET%

REM Run Python script with all arguments
python "%TARGET%" %*