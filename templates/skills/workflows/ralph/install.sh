#!/bin/bash
# Ralph Autonomous Loop Skill Installation
# This script is executed when users run: rulebook init or rulebook skill enable ralph

set -e

echo "🔧 Installing Ralph Autonomous Loop Skill..."

# Check if rulebook is installed
if ! command -v rulebook &> /dev/null; then
  echo "❌ Error: @hivehub/rulebook not found"
  echo "   Install with: npm install -g @hivehub/rulebook"
  exit 1
fi

# Check if .rulebook config exists
if [ ! -f ".rulebook" ]; then
  echo "❌ Error: .rulebook config not found"
  echo "   Run: rulebook init"
  exit 1
fi

# Enable Ralph in .rulebook config
echo "📝 Enabling Ralph in .rulebook..."
if grep -q '"ralph"' .rulebook; then
  # Ralph section exists, update enabled flag
  sed -i.bak 's/"enabled": false/"enabled": true/g' .rulebook && rm -f .rulebook.bak
else
  # Add Ralph section to config
  # Insert before closing }
  sed -i.bak '$ s/}/,\n  "ralph": {\n    "enabled": true,\n    "maxIterations": 10,\n    "tool": "claude",\n    "maxContextLoss": 3\n  }\n}/' .rulebook && rm -f .rulebook.bak
fi

# Create Ralph directories
echo "📁 Creating Ralph directories..."
mkdir -p .rulebook-ralph/history

# Create initial PRD if tasks exist
if [ -d ".rulebook/tasks" ] && [ "$(ls -A .rulebook/tasks)" ]; then
  echo "📋 Generating PRD from existing tasks..."
  rulebook ralph init || echo "⚠️  Could not auto-generate PRD. Run: rulebook ralph init"
else
  echo "💡 No tasks found. Create tasks first: rulebook task create <task-id>"
fi

# Create .cursorrules entry for Ralph if working with Claude Code
if [ -f ".cursorrules" ]; then
  echo "🔗 Updating .cursorrules for Ralph..."
  cat >> .cursorrules << 'EOF'

## Ralph Autonomous Loop

When working with Ralph autonomous loop:

1. **Before each iteration**:
   - Read .rulebook-ralph/prd.json for task specifications
   - Read .rulebook-ralph/progress.txt for past learnings
   - Reference recent git commits for architectural context

2. **During implementation**:
   - Focus on ONE task from PRD
   - Apply patterns from progress.txt
   - Write tests first (95%+ coverage required)

3. **After implementation**:
   - Run quality gates: type-check, lint, tests, coverage
   - Commit with clear message including iteration number
   - Ralph will update progress.txt with learnings

4. **Commands**:
   - Check status: rulebook ralph status
   - View history: rulebook ralph history
   - Pause loop: rulebook ralph pause (Ctrl+C)
   - Resume: rulebook ralph resume
EOF
fi

echo ""
echo "✅ Ralph Autonomous Loop Skill Installed!"
echo ""
echo "📖 Next steps:"
echo "   1. Create tasks: rulebook task create <task-id>"
echo "   2. Initialize Ralph: rulebook ralph init"
echo "   3. Start loop: rulebook ralph run [--max-iterations N] [--tool claude]"
echo "   4. Monitor: rulebook ralph status"
echo ""
echo "📚 For more info: rulebook ralph --help"
