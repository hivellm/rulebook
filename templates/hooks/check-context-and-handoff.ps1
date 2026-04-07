# Claude Code Stop hook — context freshness monitor (PowerShell).
# See check-context-and-handoff.sh for the full design rationale.

$ErrorActionPreference = 'Stop'

$ProjectRoot = Get-Location
$ConfigFile = Join-Path $ProjectRoot '.rulebook/rulebook.json'
$HandoffDir = Join-Path $ProjectRoot '.rulebook/handoff'

$WarnPct = 75
$ForcePct = 90
$MaxContextChars = 800000

if (Test-Path $ConfigFile) {
    try {
        $cfg = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        if ($cfg.handoff.warnThresholdPct) { $WarnPct = $cfg.handoff.warnThresholdPct }
        if ($cfg.handoff.forceThresholdPct) { $ForcePct = $cfg.handoff.forceThresholdPct }
    } catch {}
}

$TranscriptSize = 0
$ClaudeDir = Join-Path $env:USERPROFILE '.claude/projects'
if (Test-Path $ClaudeDir) {
    $latest = Get-ChildItem $ClaudeDir -Recurse -Filter '*.jsonl' -File |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latest) { $TranscriptSize = $latest.Length }
}

if ($TranscriptSize -eq 0) {
    Write-Output '{}'
    exit 0
}

$Pct = [math]::Floor($TranscriptSize * 100 / $MaxContextChars)

if ($Pct -ge $ForcePct) {
    if (-not (Test-Path $HandoffDir)) { New-Item -ItemType Directory -Path $HandoffDir -Force | Out-Null }
    New-Item -ItemType File -Path (Join-Path $HandoffDir '.urgent') -Force | Out-Null
    $msg = "CONTEXT AT ${Pct}% (FORCE THRESHOLD). You MUST invoke /handoff NOW."
    $out = @{ hookSpecificOutput = @{ hookEventName = 'Stop'; additionalContext = $msg } } | ConvertTo-Json -Compress -Depth 4
    Write-Output $out
} elseif ($Pct -ge $WarnPct) {
    $msg = "Context at ${Pct}%. Recommended: invoke /handoff to save session state."
    $out = @{ hookSpecificOutput = @{ hookEventName = 'Stop'; additionalContext = $msg } } | ConvertTo-Json -Compress -Depth 4
    Write-Output $out
} else {
    Write-Output '{}'
}
exit 0
