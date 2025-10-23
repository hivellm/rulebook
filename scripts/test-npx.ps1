# Test NPX compatibility for @hivellm/rulebook (PowerShell version)

Write-Host "🔍 Testing NPX Compatibility for @hivellm/rulebook" -ForegroundColor Blue
Write-Host ""

# Step 1: Build the project
Write-Host "📦 Building project..." -ForegroundColor Yellow
npm run build

if (!(Test-Path "dist/index.js")) {
    Write-Host "❌ Build failed: dist/index.js not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

# Step 2: Check shebang in built file
Write-Host "🔍 Checking shebang in dist/index.js..." -ForegroundColor Yellow
$firstLine = Get-Content "dist/index.js" -First 1

if ($firstLine -eq "#!/usr/bin/env node") {
    Write-Host "✅ Shebang present: $firstLine" -ForegroundColor Green
} else {
    Write-Host "❌ Shebang missing or incorrect: $firstLine" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Check templates directory
Write-Host "🔍 Checking templates directory..." -ForegroundColor Yellow
if (!(Test-Path "templates")) {
    Write-Host "❌ Templates directory not found" -ForegroundColor Red
    exit 1
}

$templateCount = (Get-ChildItem -Path "templates" -Include "*.md","*.yml" -Recurse).Count
Write-Host "✅ Found $templateCount template files" -ForegroundColor Green
Write-Host ""

# Step 4: Link package locally
Write-Host "🔗 Linking package locally..." -ForegroundColor Yellow
npm link

Write-Host "✅ Package linked successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Test command availability
Write-Host "🧪 Testing rulebook command..." -ForegroundColor Yellow
$command = Get-Command rulebook -ErrorAction SilentlyContinue
if ($command) {
    Write-Host "✅ rulebook command available" -ForegroundColor Green
} else {
    Write-Host "❌ rulebook command not found" -ForegroundColor Red
    npm unlink -g @hivellm/rulebook
    exit 1
}
Write-Host ""

# Step 6: Test help command
Write-Host "🧪 Testing rulebook --help..." -ForegroundColor Yellow
rulebook --help
Write-Host ""
Write-Host "✅ Help command works" -ForegroundColor Green
Write-Host ""

# Step 7: Clean up
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
npm unlink -g @hivellm/rulebook

Write-Host ""
Write-Host "✨ All NPX compatibility tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. npm publish (when ready)"
Write-Host "  2. Test with: npx @hivellm/rulebook init"
Write-Host ""

