<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

## When to Use OpenSpec

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

## Quick Start: Creating a Task

**Step 1: Search existing specs and changes**
```bash
openspec list --specs          # List all capabilities
openspec list                  # List active changes
```

**Step 2: Learn from examples using Context7**
```bash
# Search Context7 for OpenSpec examples and best practices
@Context7 openspec proposal examples
@Context7 openspec task structure
@Context7 openspec scenario format
```

**Step 3: Create your change proposal**
```bash
CHANGE=add-your-feature
mkdir -p openspec/changes/$CHANGE/specs/capability-name
```

**Step 4: Critical formatting rules**
```markdown
# In openspec/changes/$CHANGE/specs/capability-name/spec.md

## ADDED Requirements
### Requirement: Feature Name
The system SHALL provide...

#### Scenario: Success case
- **WHEN** user performs action
- **THEN** expected result occurs

# CRITICAL: Use exactly 4 hashtags (####) for scenarios!
# WRONG: - **Scenario:**, **Scenario**, ### Scenario:
# CORRECT: #### Scenario: Name
```

**Step 5: Validate before proceeding**
```bash
openspec validate $CHANGE --strict
```

## Common Mistakes to Avoid

❌ **WRONG Scenario Format:**
```markdown
- **Scenario: Login**      # NO - bullet format
**Scenario**: Login        # NO - bold format
### Scenario: Login        # NO - 3 hashtags
```

✅ **CORRECT Scenario Format:**
```markdown
#### Scenario: User login success
- **WHEN** valid credentials provided
- **THEN** return JWT token
```

❌ **WRONG Directory:**
```
openspec/changes/my-feature/spec.md
```

✅ **CORRECT Directory:**
```
openspec/changes/my-feature/specs/capability-name/spec.md
```

## Need Help?

1. **Read full documentation:** `@/openspec/AGENTS.md`
2. **Search Context7 for examples:** `@Context7 openspec examples`
3. **Validate your work:** `openspec validate [change-id] --strict`
4. **Debug parsing issues:** `openspec show [change-id] --json --deltas-only`

## Required Files

Every change needs:
- ✅ `proposal.md` - Why and what
- ✅ `tasks.md` - Implementation checklist
- ✅ `specs/[capability]/spec.md` - Delta requirements
- ⚠️ `design.md` - Only if architecture/security complexity

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Complete Example: Creating an OpenSpec Change

### Example: Adding Authentication Feature

**Directory Structure:**
```
openspec/changes/add-user-authentication/
├── proposal.md
├── tasks.md
├── design.md (optional)
└── specs/
    └── auth/
        └── spec.md
```

**File: `proposal.md`**
```markdown
# Proposal: Add User Authentication

## Why
Users need secure access control to protect their data and ensure only authorized users can access the system.

## What Changes
- **ADDED** JWT-based authentication system
- **ADDED** User login/logout endpoints
- **ADDED** Password hashing with bcrypt
- **ADDED** Session management

## Impact
- Affected specs: auth (new capability)
- Affected code: src/auth/, src/middleware/
- Breaking change: None (new feature)
- Dependencies: bcrypt, jsonwebtoken
```

**File: `tasks.md`**
```markdown
# Tasks: Add User Authentication

## Phase 1: Core Implementation
- [ ] 1.1 Install dependencies (bcrypt, jsonwebtoken)
- [ ] 1.2 Create User model with password field
- [ ] 1.3 Implement password hashing utility
- [ ] 1.4 Create JWT token generation/validation
- [ ] 1.5 Implement login endpoint
- [ ] 1.6 Implement logout endpoint

## Phase 2: Middleware
- [ ] 2.1 Create authentication middleware
- [ ] 2.2 Add route protection
- [ ] 2.3 Handle token expiration

## Phase 3: Testing
- [ ] 3.1 Unit tests for password hashing
- [ ] 3.2 Unit tests for JWT utilities
- [ ] 3.3 Integration tests for login/logout
- [ ] 3.4 Test authentication middleware

## Phase 4: Documentation
- [ ] 4.1 Update README with auth setup
- [ ] 4.2 Document API endpoints
- [ ] 4.3 Add security best practices guide
```

**File: `specs/auth/spec.md`**
```markdown
## ADDED Requirements

### Requirement: User Login
The system SHALL authenticate users with email and password credentials.

#### Scenario: Successful login
- **WHEN** user provides valid email and password
- **THEN** system returns JWT token
- **AND** token expires in 24 hours

#### Scenario: Invalid credentials
- **WHEN** user provides incorrect password
- **THEN** system returns 401 error
- **AND** error message does not reveal if email exists

### Requirement: Password Security
The system SHALL hash passwords using bcrypt with minimum 10 rounds.

#### Scenario: Password storage
- **WHEN** user creates account
- **THEN** password is hashed before storage
- **AND** plaintext password is never stored

### Requirement: Token Validation
The system SHALL validate JWT tokens on protected endpoints.

#### Scenario: Valid token
- **WHEN** authenticated request with valid token
- **THEN** request proceeds to handler
- **AND** user context is attached to request

#### Scenario: Expired token
- **WHEN** request with expired token
- **THEN** system returns 401 error
- **AND** client receives token refresh instruction
```

**Validate your work:**
```bash
openspec validate add-user-authentication --strict
```

## CLI Command Reference

```bash
# List all commands
openspec --help

# Initialize OpenSpec in project
openspec init

# List existing specs (capabilities)
openspec list --specs
openspec spec list --long

# List active changes (proposals)
openspec list
openspec change list --json

# Show specific spec or change
openspec show auth --type spec
openspec show add-user-authentication

# Show change deltas only
openspec show add-user-authentication --json --deltas-only

# Validate change
openspec validate add-user-authentication
openspec validate add-user-authentication --strict

# Show diff between change and current spec
openspec diff add-user-authentication

# Archive completed change
openspec archive add-user-authentication
openspec archive add-user-authentication --yes  # Non-interactive

# Update OpenSpec instructions
openspec update
```

## Integration with Context7

Use Context7 to find real-world examples and best practices:

```bash
# Find OpenSpec examples in dependencies
@Context7 /openspec/openspec examples of proposal.md
@Context7 /openspec/openspec task structure best practices
@Context7 /openspec/openspec scenario format examples

# Find similar implementations
@Context7 jwt authentication implementation examples
@Context7 password hashing with bcrypt examples
```

## Debugging Common Issues

### Issue: "Change must have at least one delta"

**Problem:** No spec files found or missing delta headers

**Solution:**
```bash
# Check directory structure
ls -la openspec/changes/your-change/specs/

# Ensure spec.md files exist in capability subdirectories
ls -la openspec/changes/your-change/specs/*/spec.md

# Verify delta headers exist
grep "## ADDED Requirements\|## MODIFIED Requirements" \
  openspec/changes/your-change/specs/*/spec.md
```

### Issue: "Requirement must have at least one scenario"

**Problem:** Scenario format is incorrect

**Solution:**
```bash
# Debug scenario parsing
openspec show your-change --json --deltas-only | jq '.deltas[].requirements'

# Check for correct format (4 hashtags)
grep "#### Scenario:" openspec/changes/your-change/specs/*/spec.md

# Common mistakes to fix:
# ❌ - **Scenario: Name**
# ❌ **Scenario**: Name
# ❌ ### Scenario: Name
# ✅ #### Scenario: Name
```

### Issue: "Silent scenario parsing failures"

**Problem:** Scenarios not appearing in validation output

**Solution:**
```bash
# Use JSON output to see what parser found
openspec show your-change --json | jq '.deltas[].requirements[].scenarios'

# Ensure exact format:
# - Line starts with: #### Scenario:
# - Followed by: scenario name
# - Then: - **WHEN** / - **THEN** / - **AND** conditions
```

## Best Practices Summary

1. ✅ **Always validate before committing:** `openspec validate --strict`
2. ✅ **Use Context7 for examples:** Search real implementations
3. ✅ **Follow exact scenario format:** 4 hashtags, WHEN/THEN/AND
4. ✅ **One capability per spec directory:** Don't mix concerns
5. ✅ **Complete MODIFIED requirements:** Include full original text
6. ✅ **Keep proposals focused:** Small, incremental changes
7. ✅ **Update documentation:** README, CHANGELOG, specs in sync

