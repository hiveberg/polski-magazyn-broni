[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 3000,

    [string]$NpmPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

$logDirectory = Join-Path $projectRoot "data\logs"
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$logFile = Join-Path $logDirectory "windows-service.log"

try {
    if (-not $NpmPath -or -not (Test-Path -LiteralPath $NpmPath)) {
        $npm = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
        if ($npm) {
            $NpmPath = $npm.Source
        } else {
            $machineNpm = Join-Path $env:ProgramFiles "nodejs\npm.cmd"
            if (Test-Path -LiteralPath $machineNpm) {
                $NpmPath = $machineNpm
            }
        }
    }

    if (-not $NpmPath -or -not (Test-Path -LiteralPath $NpmPath)) {
        throw "Nie znaleziono npm.cmd. Uruchom ponownie setup-windows.cmd."
    }

    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Start PMBP na porcie $Port" | Out-File -FilePath $logFile -Append -Encoding ascii
    & $NpmPath run start -- --hostname 0.0.0.0 --port "$Port" *>> $logFile
    $serverExitCode = $LASTEXITCODE
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] PMBP zakonczyl prace z kodem $serverExitCode" | Out-File -FilePath $logFile -Append -Encoding ascii
    exit $serverExitCode
} catch {
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] BLAD: $($_.Exception.Message)" | Out-File -FilePath $logFile -Append -Encoding ascii
    exit 1
}
