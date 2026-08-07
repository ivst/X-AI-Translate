$ErrorActionPreference = "Stop"

$taskName = "AI Translate Subscription Bridge"
$bridgeDirectory = (Resolve-Path (Join-Path $PSScriptRoot ".")).Path
$serverPath = (Resolve-Path (Join-Path $bridgeDirectory "server.mjs")).Path
$nodePath = (Get-Command node -ErrorAction Stop).Source
$userId = "$env:USERDOMAIN\$env:USERNAME"
$arguments = "--no-warnings `"$serverPath`""

$action = New-ScheduledTaskAction `
  -Execute $nodePath `
  -Argument $arguments `
  -WorkingDirectory $bridgeDirectory
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId
$principal = New-ScheduledTaskPrincipal `
  -UserId $userId `
  -LogonType InteractiveToken `
  -RunLevel LeastPrivilege

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Description "Starts the AI Translate local subscription bridge for the current user." `
  -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Write-Host "AI Translate bridge is registered and started for $userId."
Write-Host "The bridge listens on http://127.0.0.1:32123."
