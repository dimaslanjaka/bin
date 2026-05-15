@echo off

:: Run the specific Jest test file while ignoring .mjs files.
:: Use caret (^) for line continuation in Windows CMD.
npx jest ^
  --runInBand ^
  --forceExit ^
  --testTimeout=120000 ^
  --testPathIgnorePatterns="\\.mjs$" ^
  --detectOpenHandles ^
  %*
