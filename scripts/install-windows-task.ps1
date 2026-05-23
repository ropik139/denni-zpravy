$ErrorActionPreference = "Stop"

$taskName = "DenniZpravyUpdate"
$scriptPath = Join-Path $PSScriptRoot "run-update.ps1"
$fso = New-Object -ComObject Scripting.FileSystemObject
$shortScriptPath = $fso.GetFile($scriptPath).ShortPath
$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $shortScriptPath"

try {
  $action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
  $trigger = New-ScheduledTaskTrigger -Daily -At 7:15am
  $settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries

  Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Updates the local Denni zpravy data files every day." `
    -Force | Out-Null
} catch {
  schtasks.exe /Create /TN $taskName /TR $taskCommand /SC DAILY /ST 07:15 /F /RL LIMITED | Out-Null
}

$startupPath = [Environment]::GetFolderPath("Startup")
$startupCommand = Join-Path $startupPath "DenniZpravyUpdate.cmd"
Set-Content `
  -LiteralPath $startupCommand `
  -Value "@echo off`r`npowershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File $shortScriptPath`r`n" `
  -Encoding ASCII

Write-Host "Installed scheduled task: $taskName"
Write-Host "Installed startup updater: $startupCommand"
