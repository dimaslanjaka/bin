$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
    $scriptPath = $PSCommandPath
    if (-not $scriptPath) {
        $scriptPath = $MyInvocation.MyCommand.Path
    }

    Write-Host "Requesting administrator privileges..."
    Start-Process -FilePath "PowerShell.exe" -Verb RunAs -ArgumentList @(
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        $scriptPath
    )
    exit
}

$IntervalSeconds = 5
$WatchSeconds = 5
$KeepWindowOpen = $false
$ShippingProcessName = "MadGlobal-Win64-Shipping"
$LauncherProcessName = "MadGlobal.exe"

function Write-Log {
    param(
        [string]$Message
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message"
}

function Get-ParentProcess {
    param(
        [int]$ChildPid
    )

    try {
        $child = Get-CimInstance Win32_Process -Filter "ProcessId = $ChildPid" -ErrorAction Stop
        if (-not $child) {
            return $null
        }

        return Get-CimInstance Win32_Process -Filter "ProcessId = $($child.ParentProcessId)" -ErrorAction SilentlyContinue
    }
    catch {
        return $null
    }
}

function Stop-ProcessTree {
    param(
        [int]$RootPid,
        [string]$ExpectedProcessName
    )

    if ($RootPid -le 0) {
        Write-Log "Invalid root PID: $RootPid"
        return $false
    }

    if ($RootPid -eq $PID) {
        Write-Log "Refusing to kill current PowerShell process PID $RootPid"
        return $false
    }

    $root = Get-Process -Id $RootPid -ErrorAction SilentlyContinue
    if (-not $root) {
        Write-Log "Root process PID $RootPid no longer exists."
        return $false
    }

    if ($ExpectedProcessName) {
        $actualName = "$($root.ProcessName).exe"
        if ($actualName -ine $ExpectedProcessName) {
            Write-Log "Refusing to kill PID $RootPid because process is $actualName (expected $ExpectedProcessName)."
            return $false
        }
    }

    $taskkillOutput = & taskkill /F /T /PID $RootPid 2>&1
    $taskkillExitCode = $LASTEXITCODE

    if ($taskkillExitCode -ne 0) {
        Write-Log "taskkill failed for PID $RootPid with exit code $taskkillExitCode"
        foreach ($line in $taskkillOutput) {
            Write-Log "taskkill: $line"
        }
        return $false
    }

    Write-Log "Killed process tree for PID $RootPid"
    return $true
}

$startedAt = Get-Date
if ($WatchSeconds -gt 0) {
    Write-Log "Watching $ShippingProcessName.exe every $IntervalSeconds second(s) for up to $WatchSeconds second(s)."
}
else {
    Write-Log "Watching $ShippingProcessName.exe every $IntervalSeconds second(s) until stopped."
}

while ($true) {
    if ($WatchSeconds -gt 0) {
        $elapsed = (Get-Date) - $startedAt
        if ($elapsed.TotalSeconds -ge $WatchSeconds) {
            Write-Log "Watch limit reached ($WatchSeconds second(s)). Exiting."
            break
        }
    }

    $shippingProcesses = Get-Process -Name $ShippingProcessName -ErrorAction SilentlyContinue

    foreach ($shipping in $shippingProcesses) {
        $responding = $true
        try {
            $responding = [bool]$shipping.Responding
        }
        catch {
            # If we cannot read Responding, skip this process safely.
            continue
        }

        if ($responding) {
            continue
        }

        Write-Log "$($ShippingProcessName).exe PID $($shipping.Id) is not responding."

        $parent = Get-ParentProcess -ChildPid $shipping.Id
        if (-not $parent) {
            Write-Log "Could not resolve parent process for PID $($shipping.Id)."
            continue
        }

        if ($parent.Name -ieq $LauncherProcessName) {
            Write-Log "Killing launcher tree: $($parent.Name) PID $($parent.ProcessId)"
            $result = Stop-ProcessTree -RootPid ([int]$parent.ProcessId) -ExpectedProcessName $LauncherProcessName
            if (-not $result) {
                Write-Log "Launcher tree kill found no running processes."
            }
        }
        else {
            Write-Log "Parent process is $($parent.Name) PID $($parent.ProcessId); expected $LauncherProcessName. No action taken."
        }
    }

    if ($WatchSeconds -gt 0) {
        $remaining = $WatchSeconds - [int]((Get-Date) - $startedAt).TotalSeconds
        if ($remaining -le 0) {
            Write-Log "Watch limit reached ($WatchSeconds second(s)). Exiting."
            break
        }

        if ($remaining -lt $IntervalSeconds) {
            Start-Sleep -Seconds $remaining
            continue
        }
    }

    Start-Sleep -Seconds $IntervalSeconds
}

if ($KeepWindowOpen) {
    Write-Host ""
    Read-Host "Debug mode: press Enter to close"
}
