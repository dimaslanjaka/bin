@echo off
FOR /d /r . %%d in (node_modules) DO (
  DEL /F/S/Q "%%d" > NUL 2>&1
  RMDIR /S/Q "%%d" > NUL 2>&1
)