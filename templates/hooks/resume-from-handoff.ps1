# Claude Code SessionStart hook — auto-restore from handoff (PowerShell).
# See resume-from-handoff.sh for the full design rationale.

$ErrorActionPreference = 'Stop'

$ProjectRoot = Get-Location
$HandoffDir = Join-Path $ProjectRoot '.rulebook/handoff'
$Pending = Join-Path $HandoffDir '_pending.md'
$Urgent = Join-Path $HandoffDir '.urgent'

if (-not (Test-Path $Pending)) {
    Write-Output '{}'
    exit 0
}

$content = Get-Content $Pending -Raw
$timestamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH-mm-ss')
$archiveName = "${timestamp}.md"
Move-Item $Pending (Join-Path $HandoffDir $archiveName) -Force

if (Test-Path $Urgent) { Remove-Item $Urgent -Force }

$header = "## Session restored from handoff ($archiveName)`n`n"
$ctx = $header + $content
$out = @{
    hookSpecificOutput = @{
        hookEventName = 'SessionStart'
        additionalContext = $ctx
    }
} | ConvertTo-Json -Compress -Depth 4

Write-Output $out
exit 0
