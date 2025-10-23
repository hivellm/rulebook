#!/bin/bash

# Test NPX compatibility for @hivellm/rulebook

set -e

echo "🔍 Testing NPX Compatibility for @hivellm/rulebook"
echo ""

# Step 1: Build the project
echo "📦 Building project..."
npm run build

if [ ! -f "dist/index.js" ]; then
  echo "❌ Build failed: dist/index.js not found"
  exit 1
fi

echo "✅ Build successful"
echo ""

# Step 2: Check shebang in built file
echo "🔍 Checking shebang in dist/index.js..."
FIRST_LINE=$(head -n 1 dist/index.js)

if [[ "$FIRST_LINE" == "#!/usr/bin/env node" ]]; then
  echo "✅ Shebang present: $FIRST_LINE"
else
  echo "❌ Shebang missing or incorrect: $FIRST_LINE"
  exit 1
fi
echo ""

# Step 3: Check templates directory
echo "🔍 Checking templates directory..."
if [ ! -d "templates" ]; then
  echo "❌ Templates directory not found"
  exit 1
fi

TEMPLATE_COUNT=$(find templates -name "*.md" -o -name "*.yml" | wc -l)
echo "✅ Found $TEMPLATE_COUNT template files"
echo ""

# Step 4: Link package locally
echo "🔗 Linking package locally..."
npm link

echo "✅ Package linked successfully"
echo ""

# Step 5: Test command availability
echo "🧪 Testing rulebook command..."
if command -v rulebook &> /dev/null; then
  echo "✅ rulebook command available"
else
  echo "❌ rulebook command not found"
  npm unlink -g @hivellm/rulebook
  exit 1
fi
echo ""

# Step 6: Test help command
echo "🧪 Testing rulebook --help..."
rulebook --help
echo ""
echo "✅ Help command works"
echo ""

# Step 7: Clean up
echo "🧹 Cleaning up..."
npm unlink -g @hivellm/rulebook

echo ""
echo "✨ All NPX compatibility tests passed!"
echo ""
echo "Next steps:"
echo "  1. npm publish (when ready)"
echo "  2. Test with: npx @hivellm/rulebook init"
echo ""

