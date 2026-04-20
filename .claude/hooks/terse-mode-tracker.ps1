# Claude Code UserPromptSubmit hook for rulebook-terse (v5.4.0) — Windows.
#
# Mirrors templates/hooks/terse-mode-tracker.sh. Parses slash commands
# + natural-language activation/deactivation, updates the flag file,
# and emits an attention anchor JSON for persistent modes.

$ErrorActionPreference = 'SilentlyContinue'

$validModes = @('off','brief','terse','ultra','commit','review')
$maxFlagBytes = 32

$input = $null
try { $input = [Console]::In.ReadToEnd() } catch { }

$prompt = ''
$cwd = $null
if ($input) {
  try {
    $parsed = $input | ConvertFrom-Json
    if ($parsed.prompt) { $prompt = $parsed.prompt }
    if ($parsed.cwd)    { $cwd = $parsed.cwd }
  } catch { }
}

$projectRoot = if ($cwd) { $cwd } elseif ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
$flagPath = Join-Path $projectRoot '.rulebook/.terse-mode'
$projectCfg = Join-Path $projectRoot '.rulebook/rulebook.json'
$userCfgBase = if ($env:XDG_CONFIG_HOME) { $env:XDG_CONFIG_HOME } else { Join-Path $env:APPDATA 'rulebook' }
$userCfg = Join-Path $userCfgBase 'config.json'

function Get-ConfigMode([string]$path) {
  if (-not (Test-Path $path)) { return $null }
  try {
    $cfg = Get-Content -Raw -ErrorAction Stop $path | ConvertFrom-Json
    if ($cfg -and $cfg.terse -and $cfg.terse.defaultMode) { return $cfg.terse.defaultMode }
  } catch { }
  return $null
}

function Resolve-DefaultMode {
  foreach ($candidate in @(
    $env:RULEBOOK_TERSE_MODE,
    (Get-ConfigMode $projectCfg),
    (Get-ConfigMode $userCfg)
  )) {
    if ($candidate) {
      $m = $candidate.Trim().ToLower()
      if ($validModes -contains $m) { return $m }
    }
  }
  return 'terse'
}

function Write-SafeFlag([string]$content) {
  $dir = Split-Path -Parent $flagPath
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
  $parentAttr = (Get-Item $dir -Force).Attributes
  if ($parentAttr -band [IO.FileAttributes]::ReparsePoint) { return }
  if (Test-Path $flagPath) {
    $attr = (Get-Item $flagPath -Force).Attributes
    if ($attr -band [IO.FileAttributes]::ReparsePoint) { return }
  }
  $tmp = Join-Path $dir (".terse-mode." + [Guid]::NewGuid().ToString('N').Substring(0,8))
  try {
    [IO.File]::WriteAllText($tmp, $content, (New-Object Text.UTF8Encoding $false))
    Move-Item -Force $tmp $flagPath
  } catch {
    if (Test-Path $tmp) { Remove-Item -Force $tmp }
  }
}

function Read-Flag {
  if (-not (Test-Path $flagPath)) { return $null }
  $attr = (Get-Item $flagPath -Force).Attributes
  if ($attr -band [IO.FileAttributes]::ReparsePoint) { return $null }
  $size = (Get-Item $flagPath).Length
  if ($size -gt $maxFlagBytes) { return $null }
  $raw = (Get-Content -Raw $flagPath).Trim().ToLower()
  if ($validModes -contains $raw) { return $raw }
  return $null
}

$defaultMode = Resolve-DefaultMode
$lowerPrompt = $prompt.ToLower()

$newMode = $null
$deactivate = $false

if ($lowerPrompt -match '^\s*/rulebook-terse-commit\b') {
  $newMode = 'commit'
}
elseif ($lowerPrompt -match '^\s*/rulebook-terse-review\b') {
  $newMode = 'review'
}
elseif ($lowerPrompt -match '^\s*/rulebook-terse\s*$') {
  $newMode = $defaultMode
}
elseif ($lowerPrompt -match '^\s*/rulebook-terse\s+(\S+)') {
  $arg = $Matches[1]
  switch ($arg) {
    'off'    { $deactivate = $true }
    { @('brief','terse','ultra','commit','review') -contains $_ } { $newMode = $arg }
  }
}

if (-not $newMode -and -not $deactivate) {
  $deactRegexes = @(
    '\b(stop|disable|turn off|deactivate)\b.*\brulebook[- ]?terse\b',
    '\brulebook[- ]?terse\b.*\b(stop|disable|turn off|deactivate)\b',
    '\b(stop|disable) terse\b',
    '\bnormal mode\b'
  )
  foreach ($re in $deactRegexes) {
    if ($prompt -match $re) { $deactivate = $true; break }
  }
}

if (-not $newMode -and -not $deactivate) {
  $actRegexes = @(
    '\b(activate|enable|turn on|start)\b.*\brulebook[- ]?terse\b',
    '\brulebook[- ]?terse\b.*\b(mode|activate|enable|turn on|start)\b',
    '\bbe terse\b',
    '\bterse mode\b',
    '\bless tokens?\b'
  )
  foreach ($re in $actRegexes) {
    if ($prompt -match $re) { $newMode = $defaultMode; break }
  }
}

if ($deactivate) {
  if (Test-Path $flagPath) { Remove-Item -Force $flagPath }
}
elseif ($newMode) {
  if ($newMode -eq 'off') {
    if (Test-Path $flagPath) { Remove-Item -Force $flagPath }
  } else {
    Write-SafeFlag $newMode
  }
}

$active = Read-Flag
if ($active -and $active -ne 'off' -and $active -ne 'commit' -and $active -ne 'review') {
  $keep = if ($active -eq 'brief') { 'Keep articles and full sentences.' } else { 'Fragments OK.' }
  $text = "RULEBOOK-TERSE ACTIVE ($active). Drop filler/hedging/pleasantries. $keep Code/tests/commits/security: write full. Quality-gate failures + destructive ops: write full."
  $payload = @{
    hookSpecificOutput = @{
      hookEventName = 'UserPromptSubmit'
      additionalContext = $text
    }
  } | ConvertTo-Json -Compress -Depth 5
  Write-Output $payload
}
