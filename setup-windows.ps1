[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 3000,

    [ValidateSet("Production", "Development")]
    [string]$Mode = "Production",

    [switch]$NoStart,
    [switch]$InstallNode,
    [switch]$NoAutoStart
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0
$script:InstallerScriptPath = $PSCommandPath

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Refresh-ProcessPath {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

function Test-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Restart-AsAdministrator {
    $scriptPath = $script:InstallerScriptPath
    if (-not $scriptPath) {
        throw "Nie udalo sie ustalic sciezki instalatora do ponownego uruchomienia z uprawnieniami administratora."
    }
    $arguments = @(
        "-NoLogo",
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", ('"{0}"' -f $scriptPath),
        "-Port", "$Port",
        "-Mode", $Mode
    )
    if ($NoStart) { $arguments += "-NoStart" }
    if ($InstallNode) { $arguments += "-InstallNode" }
    if ($NoAutoStart) { $arguments += "-NoAutoStart" }

    Write-Host "Instalacja autostartu wymaga jednorazowej zgody administratora Windows." -ForegroundColor Yellow
    $process = Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList ($arguments -join " ") -Wait -PassThru
    exit $process.ExitCode
}

function Install-NodeLts {
    $winget = Get-Command "winget.exe" -ErrorAction SilentlyContinue
    if (-not $winget) {
        throw "Nie znaleziono Node.js ani winget. Zainstaluj Node.js 22 LTS x64 z https://nodejs.org/ i uruchom skrypt ponownie."
    }

    Write-Step "Instalowanie Node.js LTS przez winget"
    & $winget.Source install --id OpenJS.NodeJS.LTS --exact --source winget --accept-package-agreements --accept-source-agreements | Out-Host
    $installExitCode = $LASTEXITCODE
    if ($installExitCode -ne 0) {
        throw "Instalacja Node.js przez winget nie powiodla sie (kod $installExitCode)."
    }
    Refresh-ProcessPath
}

function Find-NodeAndNpm {
    $node = Get-Command "node.exe" -ErrorAction SilentlyContinue
    $npm = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
    if ((-not $node) -or (-not $npm)) {
        if ($InstallNode) {
            Install-NodeLts
            $node = Get-Command "node.exe" -ErrorAction SilentlyContinue
            $npm = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
        }
    }
    if ((-not $node) -or (-not $npm)) {
        throw "Wymagany jest Node.js 20.9 lub nowszy (zalecany Node.js 22 LTS). Uruchom setup-windows.cmd albo wywolaj ten skrypt z parametrem -InstallNode."
    }
    return @($node.Source, $npm.Source)
}

function Invoke-Checked {
    param(
        [string]$Label,
        [string]$FilePath,
        [string[]]$Arguments
    )
    Write-Step $Label
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Label nie powiodlo sie (kod $LASTEXITCODE)."
    }
}

function Register-PmbpStartupTask {
    param(
        [string]$ProjectRoot,
        [string]$NpmPath,
        [int]$ListenPort
    )

    $taskName = "PMBP - Polski Magazyn Broni Palnej"
    $launcherPath = Join-Path $ProjectRoot "start-windows-scheduled.ps1"
    $powershellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
    $actionArguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$launcherPath`" -Port $ListenPort -NpmPath `"$NpmPath`""
    $action = New-ScheduledTaskAction -Execute $powershellPath -Argument $actionArguments -WorkingDirectory $ProjectRoot
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Uruchamia lokalny serwer PMBP przy starcie Windows." -Force | Out-Null
    return $taskName
}

if ($env:OS -ne "Windows_NT") {
    throw "Ten skrypt jest przeznaczony dla Windows 10 lub nowszego."
}

if (($Mode -eq "Production") -and (-not $NoAutoStart) -and (-not (Test-Administrator))) {
    Restart-AsAdministrator
}

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "package.json"))) {
    throw "Nie znaleziono package.json. Uruchom skrypt z glownego katalogu projektu PMBP."
}

Write-Host "PMBP - instalacja dla Windows 10" -ForegroundColor White
Write-Host "Katalog: $projectRoot"

$commands = Find-NodeAndNpm
$nodeCommand = $commands[0]
$npmCommand = $commands[1]
$nodeVersionText = (& $nodeCommand --version).Trim().TrimStart("v")
$nodeVersionParts = $nodeVersionText.Split(".")
$nodeMajor = [int]$nodeVersionParts[0]
$nodeMinor = [int]$nodeVersionParts[1]
if (($nodeMajor -lt 20) -or (($nodeMajor -eq 20) -and ($nodeMinor -lt 9))) {
    throw "Wykryto Node.js $nodeVersionText. PMBP wymaga co najmniej Node.js 20.9; zalecana jest wersja 22 LTS."
}
Write-Host "Node.js: $nodeVersionText" -ForegroundColor Green
Write-Host "npm: $(& $npmCommand --version)" -ForegroundColor Green

$startupTaskName = "PMBP - Polski Magazyn Broni Palnej"
if (($Mode -eq "Production") -and (-not $NoAutoStart)) {
    $existingTask = Get-ScheduledTask -TaskName $startupTaskName -ErrorAction SilentlyContinue
    if ($existingTask -and $existingTask.State -eq "Running") {
        Write-Step "Zatrzymywanie poprzedniej instancji PMBP"
        Stop-ScheduledTask -TaskName $startupTaskName
        Start-Sleep -Seconds 2
    }
}

$envPath = Join-Path $projectRoot ".env"
$envExamplePath = Join-Path $projectRoot ".env.example"
if (-not (Test-Path -LiteralPath $envPath)) {
    if (-not (Test-Path -LiteralPath $envExamplePath)) {
        throw "Nie znaleziono pliku .env.example."
    }
    Write-Step "Tworzenie konfiguracji .env"
    Copy-Item -LiteralPath $envExamplePath -Destination $envPath
    if ($Port -ne 3000) {
        $content = [IO.File]::ReadAllText($envPath)
        $content = [Text.RegularExpressions.Regex]::Replace($content, '(?m)^APP_URL=.*$', "APP_URL=`"http://localhost:$Port`"")
        $utf8WithoutBom = New-Object Text.UTF8Encoding($false)
        [IO.File]::WriteAllText($envPath, $content, $utf8WithoutBom)
    }
    Write-Host "Utworzono .env. Istniejace konfiguracje i bazy nie sa nadpisywane." -ForegroundColor Green
} else {
    Write-Host "Zachowano istniejacy plik .env." -ForegroundColor Yellow
}

# The repository lock file can be generated on macOS or Linux. npm 11 validates
# optional, platform-specific packages during `npm ci` and can reject such a
# lock file on Windows before it has a chance to add the Windows packages.
# `npm install` keeps locked versions and safely completes the platform graph.
Invoke-Checked "Instalowanie zaleznosci dla Windows" $npmCommand @("install", "--no-audit", "--no-fund")

Invoke-Checked "Przygotowanie katalogow, bazy, migracji i konta startowego" $npmCommand @("run", "setup")

if ($Mode -eq "Production") {
    Invoke-Checked "Budowanie wersji produkcyjnej" $npmCommand @("run", "build")
}

if (($Mode -eq "Production") -and (-not $NoAutoStart)) {
    Write-Step "Konfigurowanie automatycznego startu z Windows"
    $startupTaskName = Register-PmbpStartupTask -ProjectRoot $projectRoot -NpmPath $npmCommand -ListenPort $Port
    Write-Host "Utworzono zadanie systemowe: $startupTaskName" -ForegroundColor Green
}

Write-Host ""
Write-Host "PMBP jest gotowy." -ForegroundColor Green
Write-Host "Adres lokalny: http://localhost:$Port" -ForegroundColor White
Write-Host "Pierwsze logowanie: admin / admin" -ForegroundColor Yellow
Write-Host "System od razu wymusi utworzenie wlasciwego administratora." -ForegroundColor Yellow

try {
    $lanAddress = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
        Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
        Select-Object -First 1 -ExpandProperty IPAddress
    if ($lanAddress) {
        Write-Host "Adres w sieci lokalnej: http://${lanAddress}:$Port" -ForegroundColor White
    }
} catch {
    Write-Host "Nie udalo sie automatycznie ustalic adresu sieci lokalnej." -ForegroundColor DarkYellow
}

if ($NoStart) {
    Write-Host ""
    Write-Host "Aby uruchomic system pozniej, uzyj start-windows.cmd $Port" -ForegroundColor Cyan
    exit 0
}

if (($Mode -eq "Production") -and (-not $NoAutoStart)) {
    Write-Step "Uruchamianie PMBP jako zadania systemowego"
    Start-ScheduledTask -TaskName $startupTaskName
    Start-Sleep -Seconds 2
    $task = Get-ScheduledTask -TaskName $startupTaskName
    Write-Host "Stan zadania: $($task.State)" -ForegroundColor Green
    Write-Host "PMBP uruchomi sie automatycznie przy kazdym starcie Windows." -ForegroundColor Green
    exit 0
}

if ($Mode -eq "Development") {
    Invoke-Checked "Uruchamianie serwera deweloperskiego" $npmCommand @("run", "dev", "--", "--hostname", "0.0.0.0", "--port", "$Port")
} else {
    Invoke-Checked "Uruchamianie serwera produkcyjnego" $npmCommand @("run", "start", "--", "--hostname", "0.0.0.0", "--port", "$Port")
}
