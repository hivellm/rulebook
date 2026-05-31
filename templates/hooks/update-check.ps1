# Claude Code SessionStart hook — rulebook update check (Windows).
#
# Mirrors templates/hooks/update-check.sh: compares the project's installed
# rulebook version (.rulebook/rulebook.json -> version) against the latest
# @hivehub/rulebook on npm, cached 24h in .rulebook/.update-check. Emits an
# additionalContext advisory when a newer version exists, else `{}`.

$ErrorActionPreference = 'SilentlyContinue'

function Emit-None { Write-Output '{}'; exit 0 }

# Resolve project root from stdin JSON cwd, else env, else pwd.
$inputRaw = $null
if ([Console]::IsInputRedirected) { try { $inputRaw = [Console]::In.ReadToEnd() } catch { } }
$projectRoot = $null
if ($inputRaw) { try { $projectRoot = (ConvertFrom-Json $inputRaw).cwd } catch { } }
if (-not $projectRoot) {
  if ($env:CLAUDE_PROJECT_DIR) { $projectRoot = $env:CLAUDE_PROJECT_DIR }
  else { $projectRoot = (Get-Location).Path }
}

$configFile = Join-Path $projectRoot '.rulebook/rulebook.json'
$cacheFile  = Join-Path $projectRoot '.rulebook/.update-check'
$pkg = '@hivehub/rulebook'
$cacheTtl = 86400

if (-not (Test-Path $configFile)) { Emit-None }

$config = $null
try { $config = Get-Content -Raw $configFile | ConvertFrom-Json } catch { Emit-None }
$installed = $config.version
if (-not $installed) { Emit-None }
if ($config.updateCheck -and $config.updateCheck.enabled -eq $false) { Emit-None }

$now = [int][double]::Parse((Get-Date -UFormat %s))
$latest = $null
$cacheTs = 0
if (Test-Path $cacheFile) {
  try {
    $cache = Get-Content -Raw $cacheFile | ConvertFrom-Json
    $cacheTs = [int]$cache.checkedAt
    $latest = $cache.latest
  } catch { }
}

$age = $now - $cacheTs
if (-not $latest -or $age -ge $cacheTtl) {
  $fetched = $null
  try {
    $job = Start-Job { param($p) npm view $p version 2>$null } -ArgumentList $pkg
    if (Wait-Job $job -Timeout 5) { $fetched = (Receive-Job $job) }
    Remove-Job $job -Force
  } catch { }
  if ($fetched) {
    $latest = ("$fetched").Trim()
    try {
      [IO.File]::WriteAllText($cacheFile, (@{ latest = $latest; checkedAt = $now } | ConvertTo-Json -Compress))
    } catch { }
  }
}

if (-not $latest) { Emit-None }

function Ver-Gt([string]$a, [string]$b) {
  $aa = ($a -split '-')[0]; $bb = ($b -split '-')[0]
  $A = $aa -split '\.'; $B = $bb -split '\.'
  for ($i = 0; $i -lt 3; $i++) {
    $ai = 0; $bi = 0
    if ($A[$i]) { [int]::TryParse(($A[$i] -replace '[^0-9]', ''), [ref]$ai) | Out-Null }
    if ($B[$i]) { [int]::TryParse(($B[$i] -replace '[^0-9]', ''), [ref]$bi) | Out-Null }
    if ($ai -gt $bi) { return $true }
    if ($ai -lt $bi) { return $false }
  }
  return $false
}

if (Ver-Gt $latest $installed) {
  $ctx = "## Rulebook update available`n`nThis project is on rulebook **$installed**, but **$latest** is published on npm.`n`nAsk the user whether they want to update. If they agree, run ``rulebook update`` (or ``npx $pkg@latest update``) to regenerate the rules to the latest version, then review the diff before committing. Do not update without the user's confirmation."
  $out = @{ hookSpecificOutput = @{ hookEventName = 'SessionStart'; additionalContext = $ctx } }
  Write-Output ($out | ConvertTo-Json -Compress -Depth 4)
  exit 0
}

Emit-None
