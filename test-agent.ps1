# PowerShell script to test agent manager
param(
    [switch]$Quick,
    [switch]$Verbose,
    [switch]$Help
)

if ($Help) {
    Write-Host "Agent Manager Test Suite" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Usage: .\test-agent.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Quick      Run only critical tests"
    Write-Host "  -Verbose    Show detailed output"
    Write-Host "  -Help       Show this help message"
    Write-Host ""
    Write-Host "Available tests:"
    Write-Host "  Type Check, Build, Lint, Format Check, Agent Manager Tests, Agent CLI Tests"
    exit 0
}

Write-Host "🤖 Agent Manager Test Suite" -ForegroundColor Blue
Write-Host ""

$tests = @(
    @{ Name = "Type Check"; Command = "npx tsc --noEmit"; Critical = $true },
    @{ Name = "Build"; Command = "npx tsc"; Critical = $true },
    @{ Name = "Lint"; Command = "npx eslint src/**/*.ts"; Critical = $false },
    @{ Name = "Format Check"; Command = "npx prettier --check `"src/**/*.ts`" `"tests/**/*.ts`""; Critical = $false },
    @{ Name = "Agent Manager Tests"; Command = "npx vitest run tests/agent-manager-comprehensive.test.ts"; Critical = $true },
    @{ Name = "Agent CLI Tests"; Command = "npx vitest run tests/agent-manager-cli.test.ts"; Critical = $true }
)

if ($Quick) {
    $tests = $tests | Where-Object { $_.Critical -eq $true }
    Write-Host "Running quick test suite (critical tests only)" -ForegroundColor Yellow
    Write-Host ""
}

$results = @()
$criticalFailures = 0

foreach ($test in $tests) {
    Write-Host "Running $($test.Name)..." -ForegroundColor Gray
    
    try {
        $output = Invoke-Expression $test.Command 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $($test.Name) passed" -ForegroundColor Green
            $results += @{ Name = $test.Name; Success = $true; Critical = $test.Critical }
        } else {
            $icon = if ($test.Critical) { "❌" } else { "⚠️" }
            $color = if ($test.Critical) { "Red" } else { "Yellow" }
            Write-Host "$icon $($test.Name) $($test.Critical ? 'failed' : 'has issues')" -ForegroundColor $color
            
            if ($Verbose -and $output) {
                Write-Host "Output: $output" -ForegroundColor Gray
            }
            
            $results += @{ Name = $test.Name; Success = $false; Critical = $test.Critical }
            if ($test.Critical) { $criticalFailures++ }
        }
    } catch {
        $icon = if ($test.Critical) { "❌" } else { "⚠️" }
        $color = if ($test.Critical) { "Red" } else { "Yellow" }
        Write-Host "$icon $($test.Name) $($test.Critical ? 'failed' : 'has issues')" -ForegroundColor $color
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        
        $results += @{ Name = $test.Name; Success = $false; Critical = $test.Critical }
        if ($test.Critical) { $criticalFailures++ }
    }
    
    Start-Sleep -Seconds 1
}

# Summary
Write-Host ""
Write-Host "📊 Test Summary" -ForegroundColor Blue
Write-Host ""

$passed = ($results | Where-Object { $_.Success -eq $true }).Count
$failed = ($results | Where-Object { $_.Success -eq $false }).Count
$warnings = ($results | Where-Object { $_.Success -eq $false -and $_.Critical -eq $false }).Count

Write-Host "✅ Passed: $passed" -ForegroundColor Green
if ($warnings -gt 0) {
    Write-Host "⚠️  Warnings: $warnings" -ForegroundColor Yellow
}
if ($criticalFailures -gt 0) {
    Write-Host "❌ Critical Failures: $criticalFailures" -ForegroundColor Red
}

Write-Host "Total: $($results.Count)" -ForegroundColor Gray

# Show failed tests
$failedTests = $results | Where-Object { $_.Success -eq $false }
if ($failedTests.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Failed Tests:" -ForegroundColor Red
    Write-Host ""
    foreach ($test in $failedTests) {
        $icon = if ($test.Critical) { "❌" } else { "⚠️" }
        $color = if ($test.Critical) { "Red" } else { "Yellow" }
        Write-Host "$icon $($test.Name)" -ForegroundColor $color
    }
}

if ($criticalFailures -gt 0) {
    Write-Host ""
    Write-Host "❌ Critical tests failed. Please fix before proceeding." -ForegroundColor Red
    exit 1
} elseif ($failed -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Some tests have warnings. Please review." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host ""
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
}