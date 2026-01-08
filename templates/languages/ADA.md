<!-- ADA:START -->
# Ada Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
gprbuild -P project.gpr   # Build verification
gnatcheck -P project.gpr  # Style/linting check
gprclean -P project.gpr && gprbuild -P project.gpr  # Clean build
# Run tests (project-specific command)

# SPARK verification (if using SPARK):
gnatprove -P project.gpr  # Formal verification
```

## Ada Configuration

**CRITICAL**: Use Ada 2012 or Ada 2022 with GNAT compiler.

- **Standard**: Ada 2012 or Ada 2022
- **Compiler**: GNAT 12+
- **Build**: GPRbuild
- **TestingMenuAUnit
- **StyleMenuGNAT style checks

## Code Quality Standards

### Mandatory Quality Checks

**IMPORTANT**: These commands MUST match your GitHub Actions workflows!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Style check (matches workflow)
gnatcheck -P your_project.gpr -rules -from=gnat_style.rules

# 2. Build with warnings as errors (matches workflow)
gprbuild -P your_project.gpr -cargs -gnatwa -gnatwe

# 3. Run static analysis (matches workflow)
gnatprove -P your_project.gpr --level=2

# 4. Run all tests (matches workflow)
gprbuild -P test_project.gpr
./bin/test_runner

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**Why This Matters:**
- Example: Missing `-gnatwe` (warnings as errors) = CI failures

<!-- ADA:END -->

