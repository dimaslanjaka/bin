@echo off

DEL /F/S/Q node_modules > NUL 2>&1  &  RMDIR /S/Q node_modules > NUL 2>&1
FOR /d /r . %d in (node_modules) DO @IF EXIST "%d" rm -rf "%d"