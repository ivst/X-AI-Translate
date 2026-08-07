$ErrorActionPreference = "Stop"

$taskName = "AI Translate Subscription Bridge"
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "AI Translate bridge autostart was removed."
