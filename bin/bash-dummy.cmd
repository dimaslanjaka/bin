@echo off

SETLOCAL enableExtensions enableDelayedExpansion

rem my malfunction keyboard 56^%
rem execute bash file with cygwin from batch script https://stackoverflow.com/a/43300782/6404439

set scriptDirPath=%~dp0
set terminalCwd=%CD%
set cygwinBinPath=c:\cygwin64\bin\
set minttyBin=%cygwinBinPath%mintty
set bashBin=%cygwinBinPath%bash

rem to inspect terminal output
rem c:\cygwin64\bin\mintty -h always /bin/bash -l /cygdrive/c/path/to/bash-script
rem run bash in the current console window
rem C:\cygwin64\bin\bash -l c:\path\to\your\script
rem run bash in new window (mintty)
rem C:\cygwin64\bin\mintty /bin/bash -l c:\path\to\your\script

rem %minttyBin% -h always /bin/bash -l %scriptDirPath%bash-dummy

%bashBin% -l %scriptDirPath%bash-dummy Hello World

ENDLOCAL