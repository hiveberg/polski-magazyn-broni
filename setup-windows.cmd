@echo off
setlocal
cd /d "%~dp0"

echo PMBP - instalacja dla Windows 10
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-windows.ps1" -InstallNode %*

if errorlevel 1 (
  echo.
  echo Instalacja nie powiodla sie. Szczegoly znajduja sie powyzej.
  pause
  exit /b 1
)

endlocal
