# Claude Code SessionStart hook for rulebook-terse (v5.4.0) — Windows.
#
# Mirrors templates/hooks/terse-activate.sh. Resolves mode, writes
# flag file, reads SKILL.md, filters intensity table + examples to
# the active level only, emits the filtered body to stdout.

$ErrorActionPreference = 'SilentlyContinue'

$validModes = @('off','brief','terse','ultra','commit','review')

# Read optional JSON input from stdin (SessionStart may pass metadata).
$input = $null
if (-not [Console]::IsInputRedirected) { $input = $null }
else { try { $input = [Console]::In.ReadToEnd() } catch { } }

$projectRoot = $null
if ($input) {
  try { $projectRoot = (ConvertFrom-Json $input).cwd } catch { }
}
if (-not $projectRoot) {
  if ($env:CLAUDE_PROJECT_DIR) { $projectRoot = $env:CLAUDE_PROJECT_DIR }
  else { $projectRoot = (Get-Location).Path }
}

$flagPath     = Join-Path $projectRoot '.rulebook/.terse-mode'
$projectCfg   = Join-Path $projectRoot '.rulebook/rulebook.json'
$userCfgBase  = if ($env:XDG_CONFIG_HOME) { $env:XDG_CONFIG_HOME } else { Join-Path $env:APPDATA 'rulebook' }
$userCfg      = Join-Path $userCfgBase 'config.json'

function Resolve-Mode {
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

function Get-ConfigMode([string]$path) {
  if (-not (Test-Path $path)) { return $null }
  try {
    $cfg = Get-Content -Raw -ErrorAction Stop $path | ConvertFrom-Json
    if ($cfg -and $cfg.terse -and $cfg.terse.defaultMode) {
      return $cfg.terse.defaultMode
    }
  } catch { }
  return $null
}

function Write-SafeFlag([string]$content) {
  $dir = Split-Path -Parent $flagPath
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }

  # Refuse if target or parent is a symlink.
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

$mode = Resolve-Mode

if ($mode -eq 'off') {
  if (Test-Path $flagPath) { Remove-Item -Force $flagPath }
  exit 0
}

Write-SafeFlag $mode

# Locate SKILL.md.
$skillCandidates = @(
  (Join-Path $projectRoot '.claude/skills/rulebook-terse/SKILL.md'),
  (Join-Path $projectRoot 'templates/skills/core/rulebook-terse/SKILL.md')
)
$skillBody = $null
foreach ($p in $skillCandidates) {
  if (Test-Path $p) {
    $skillBody = Get-Content -Raw $p
    break
  }
}

Write-Output "RULEBOOK-TERSE MODE ACTIVE — level: $mode"
Write-Output ""

if (-not $skillBody) {
  Write-Output @"
## Persistence
ACTIVE EVERY RESPONSE once set. Off only via "/rulebook-terse off", "normal mode", or session end.

## Rules
Drop filler (just, really, basically), pleasantries, hedging. Keep technical terms exact. Code blocks byte-for-byte unchanged.

## Auto-Clarity
Full prose for: security warnings, destructive-op confirmations, quality-gate failures, multi-step sequences, user confusion.

## Boundaries
Code/tests/commits/specs: unchanged.
"@
  exit 0
}

# Strip YAML frontmatter + filter intensity table + example rows.
$lines = $skillBody -split "`n"
$inFm = $false
$pastFm = $false
$tableRow = '^\s*\|\s*\*\*([^*]+)\*\*\s*\|'
$exampleLine = '^\s*-\s*\*\*([^*]+)\*\*\s*:'

foreach ($line in $lines) {
  if (-not $pastFm) {
    if ($line -match '^---\s*$') {
      if (-not $inFm) { $inFm = $true; continue }
      else { $inFm = $false; $pastFm = $true; continue }
    }
    if ($inFm) { continue }
  }

  if ($line -match $tableRow) {
    if ($Matches[1] -eq $mode) { Write-Output $line }
    continue
  }
  if ($line -match $exampleLine) {
    if ($Matches[1] -eq $mode) { Write-Output $line }
    continue
  }
  Write-Output $line
}
