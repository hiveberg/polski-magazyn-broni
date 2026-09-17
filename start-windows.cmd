@echo off
setlocal
cd /d "%~dp0"

set "PMBP_PORT=%~1"
if "%PMBP_PORT%"=="" set "PMBP_PORT=3000"

if not exist "node_modules" (
  echo Projekt nie zostal jeszcze przygotowany. Uruchamiam instalator.
  call "%~dp0setup-windows.cmd" -Port %PMBP_PORT%
  exit /b %errorlevel%
)

if not exist ".next\BUILD_ID" (
  echo Brak wersji produkcyjnej. Uruchamiam instalator.
  call "%~dp0setup-windows.cmd" -Port %PMBP_PORT%
  exit /b %errorlevel%
)

echo PMBP bedzie dostepny pod adresem http://localhost:%PMBP_PORT%
call npm.cmd run start -- --hostname 0.0.0.0 --port %PMBP_PORT%

if errorlevel 1 (
  echo.
  echo Nie udalo sie uruchomic PMBP.
  pause
  exit /b 1
)

endlocal
