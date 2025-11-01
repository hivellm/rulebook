<!-- OPENSPEC:START -->
# OpenSpec Instructions

**CRITICAL**: Use OpenSpec for spec-driven development of new features and breaking changes.

## When to Use

Create proposal for:
- ✅ New features/capabilities
- ✅ Breaking changes
- ✅ Architecture changes  
- ✅ Performance/security work

Skip for:
- ❌ Bug fixes (restore intended behavior)
- ❌ Typos, formatting, comments
- ❌ Dependency updates (non-breaking)

## Task Creation Guidelines

**CRITICAL**: Before creating ANY OpenSpec task, you MUST:

1. **Check Context7 MCP** (if available):
   - Use Context7 to review documentation and best practices for the technology/library involved
   - Verify the correct task format and structure
   - Review existing task examples from official documentation
   - Most AIs create tasks in the wrong format - Context7 helps prevent this

2. **Validate Format Requirements**:
   - Ensure scenario format uses `#### Scenario:` (4 hashtags)
   - Follow SHALL/MUST conventions for requirements
   - Include proper WHEN/THEN structure

**Why This Matters:**
Many AI assistants create OpenSpec tasks in incorrect formats, causing validation failures and rework. Using Context7 to review proper task structures BEFORE creation saves time and ensures consistency.

## Quick Start

```bash
# 1. Check existing
openspec list --specs
openspec list

# 2. Create change
CHANGE=add-your-feature
mkdir -p openspec/changes/$CHANGE/specs/capability-name

# 3. Create files
# - proposal.md (why, what, impact)
# - tasks.md (implementation checklist)
# - specs/capability-name/spec.md (deltas)

# 4. Validate
openspec validate $CHANGE --strict
```

## Spec Format

**CRITICAL**: Scenario format MUST be exact:

```markdown
## ADDED Requirements
### Requirement: Feature Name
The system SHALL provide...

#### Scenario: Success case
- **WHEN** user performs action
- **THEN** expected result occurs
```

❌ **WRONG:**
```markdown
- **Scenario: Login**      # NO - bullet
**Scenario**: Login        # NO - bold
### Scenario: Login        # NO - 3 hashtags
```

✅ **CORRECT:**
```markdown
#### Scenario: User login   # YES - 4 hashtags
```

## Three-Stage Workflow

### Stage 1: Create
1. Read `openspec/project.md`
2. Choose verb-led `change-id` (e.g., `add-auth`, `update-api`)
3. Create `proposal.md`, `tasks.md`, delta specs
4. Validate: `openspec validate [id] --strict`
5. Get approval

### Stage 2: Implement  
1. Read `proposal.md`, `tasks.md`
2. Implement tasks
3. Run AGENT_AUTOMATION workflow
4. Update tasks as complete
5. Document commit hash in tasks.md

### Stage 3: Archive
After deployment:
```bash
openspec archive [change] --yes
```

## Commands

```bash
openspec list                    # Active changes
openspec list --specs            # All capabilities
openspec show [item]             # View details
openspec validate [change] --strict  # Validate
openspec diff [change]           # Show changes
openspec archive [change] --yes  # Complete
```

## Best Practices

✅ **DO:**
- **Check Context7 MCP before creating tasks** (prevents format errors)
- One requirement per concern
- At least one scenario per requirement
- Use SHALL/MUST for normative requirements
- Validate before committing
- Keep changes focused and small

❌ **DON'T:**
- Create tasks without checking Context7 MCP first
- Mix multiple features in one change
- Skip scenario definitions
- Use wrong scenario format
- Start implementation before approval

## Integration with AGENT_AUTOMATION

OpenSpec drives implementation. AGENT_AUTOMATION enforces quality:

```
1. Create spec → Validate → Approve
2. Implement → Run AGENT_AUTOMATION
3. Update tasks.md with commit hash
4. Archive when deployed
```

<!-- OPENSPEC:END -->

