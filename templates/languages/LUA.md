<!-- LUA:START -->
# Lua Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
stylua --check .          # Format check
luacheck .                # Linting
busted                    # All tests (100% pass)

# No standard security audit for Lua
```

## Lua Configuration

**CRITICAL**: Use Lua 5.4 or LuaJIT with linting.

- **Version**: Lua 5.4 or LuaJIT 2.1+
- **Linter**: luacheck
- **Formatter**: StyLua
- **Testing**: busted or luaunit

## Code Quality Standards

### Mandatory Quality Checks

**IMPORTANT**: These commands MUST match your GitHub Actions workflows!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow)
stylua --check src/ tests/

# 2. Lint (matches workflow)
luacheck src/ tests/ --std luajit --no-unused-args

# 3. Run tests (matches workflow)
busted tests/

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**Why This Matters:**
- Example: Using `stylua` (writes) locally but `stylua --check` in CI = failure

### Testing Example (busted)

```lua
describe("DataProcessor", function()
  local processor
  
  before_each(function()
    processor = require("data_processor").new()
  end)
  
  it("processes valid input", function()
    local result = processor:process({1, 2, 3})
    assert.are.same({2, 4, 6}, result)
  end)
  
  it("handles empty input", function()
    assert.has_no.errors(function()
      processor:process({})
    end)
  end)
end)
```

<!-- LUA:END -->

