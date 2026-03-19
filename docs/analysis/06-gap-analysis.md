# Gap Analysis: Rulebook v4 vs Real-World Usage

What both projects had to build manually that Rulebook v4 should have provided.

---

## Gap 1: Agent Specialization Framework

### What v4 provides
- Generic agent definitions (implementer, tester, researcher, code-reviewer)
- No domain-specific expertise
- No per-agent memory
- No agent-specific checklists

### What projects built
- **UzEngine**: 43 agents with domain expertise (shader-engineer, cpp-core-expert, rhi-engineer, unreal-architect, systems-integration, ecs-systems-engineer, physics-engineer, audio-engineer, animation-engineer, ui-engineer, gameplay-systems-engineer, lua-scripting-engineer, etc.)
- **TML**: 20+ agents (codegen-debugger, tml-library-engineer, test-coverage-guardian, compiler-optimizer, qa-code-analyst, etc.)
- Both: per-agent persistent memory in `.claude/agent-memory/<agent>/`

### What v5 needs
1. **Agent template library** organized by project type (game engine, compiler, web app, mobile, etc.)
2. **Per-agent memory infrastructure** with MEMORY.md index and topic files
3. **Agent definition generator** that produces domain-specific agents from detected project type
4. **Mandatory sections** injected into every agent (no-shortcuts, update tasks, research-first)

---

## Gap 2: Anti-Shortcut Directives

### What v4 provides
- "Write tests first (95%+ coverage required)"
- "NEVER skip test assertions, create boilerplate, mock everything"
- Basic quality enforcement

### What projects built
- **Tier 1 absolute prohibitions** with explicit examples of forbidden patterns
- 8 specific forbidden behaviors: no simplify, no TODOs, no stubs, no placeholders, no cut corners, no skip edge cases, no partial implementations, no alter existing logic
- Positive alternatives: "Research first. Implement completely. Take as long as needed."
- **Repeated in every single agent definition**, not just CLAUDE.md

### What v5 needs
1. **Core anti-shortcut template** with explicit forbidden patterns and positive alternatives
2. Automatically **injected into every agent definition**
3. Calibrated severity: projects can choose "strict" (prohibit all) or "standard" (allow TODOs in non-critical code)

---

## Gap 3: Rule Modularization (.claude/rules/)

### What v4 provides
- Monolithic CLAUDE.md or AGENTS.md
- Rulebook specs in `.rulebook/specs/` (RULEBOOK.md, QUALITY_ENFORCEMENT.md, GIT.md)

### What projects built
- **UzEngine**: 17 separate rule files in `.claude/rules/`:
  - `ue5-component-parity.md`, `data-flow-first.md`, `task-decomposition.md`
  - `visual-verification.md`, `gpu-debugging.md`, `research-first.md`
  - `no-deferred.md`, `agent-teams.md`, `agent-tasks-update.md`
  - `build-order.md`, `architecture.md`, `documentation.md`
  - `lua-parity.md`, `quality.md`, `git-safety.md`, `thirdparty.md`, `editing.md`
- **TML**: 599-line CLAUDE.md with tiered sections (prohibitions → workflow → commands)

### What v5 needs
1. **Support for `.claude/rules/` directory** — modular rules that agents auto-load
2. **Rule template library** for common patterns (data-flow-first, task-decomposition, no-deferred, git-safety, sequential-editing, research-first)
3. **Rule injection into agent definitions** — each agent gets relevant rules appended

---

## Gap 4: Model Tier Assignment

### What v4 provides
- No guidance on which model to use for which tasks
- All agents default to the same model

### What projects built
- Explicit model assignment tables in CLAUDE.md
- **UzEngine**: 22 agents with opus/sonnet/haiku assignments
- **TML**: Mandatory model assignment by complexity tier

### What v5 needs
1. **Model assignment config** in `.rulebook`:
   ```json
   {
     "modelAssignment": {
       "opus": ["core-implementation", "complex-bugs", "architecture"],
       "sonnet": ["tests", "standard-implementation", "build-system"],
       "haiku": ["research", "documentation", "codebase-exploration"]
     }
   }
   ```
2. Agent definitions auto-tagged with recommended model tier

---

## Gap 5: Data Flow Planning Templates

### What v4 provides
- Task structure (proposal.md, tasks.md, specs/)
- No planning templates for multi-file changes

### What projects built
- **UzEngine**: Mandatory `dataflow-<feature>.md` with UE5 reference table, UzEngine mapping table, and ordered change list
- A dedicated `systems-integration` agent that ONLY creates planning documents (never writes code)

### What v5 needs
1. **Planning document template** for multi-file changes
2. Configurable threshold: "require planning for changes touching N+ files" (default: 3)
3. Template structure:
   ```markdown
   # Change Plan: <Feature>
   ## Files to Modify (dependency order)
   | # | File | Change | Depends On |
   ## Data Flow (if cross-subsystem)
   Component.field → Renderer reads → CB writes → Shader reads
   ## Sub-Tasks (max 2 files each)
   ```

---

## Gap 6: Team Coordination Rules

### What v4 provides
- Basic MULTI_AGENT.md template
- No file ownership rules
- No coordination protocol

### What projects built
- **UzEngine**: `.claude/rules/agent-teams.md` — TeamCreate mandatory for 2+ agents, exclusive file ownership, SendMessage for coordination
- Both: "Each agent in a team MUST work on DIFFERENT files — no two agents editing the same file"

### What v5 needs
1. **Enhanced MULTI_AGENT.md** with file ownership protocol
2. **Team patterns** (standard team, minimal team, research team, implementation team)
3. **Coordination rules**: task assignment, progress reporting, blocker escalation, shutdown management

---

## Gap 7: Session Continuity (PLANS.md)

### What v4 provides
- PLANS.md exists as a session scratchpad
- No structured format
- No automatic loading/saving guidance

### What projects built
- **TML**: Structured PLANS.md with `<!-- PLANS:CONTEXT -->`, `<!-- PLANS:TASK -->`, `<!-- PLANS:HISTORY -->` sections
- Both: "Read PLANS.md at session start" in CLAUDE.md

### What v5 needs
1. **Standardized PLANS.md structure** with delimited sections
2. **Session workflow directive**: read at start, update during, write summary at end
3. Automatic prompt to update PLANS.md at end of session

---

## Gap 8: Incremental Test Development

### What v4 provides
- "Write tests first"
- "95%+ coverage required"
- No guidance on test development process

### What projects built
- **TML**: "Write 1-3 tests at a time. Test immediately. Fix errors before proceeding. Use individual test execution, NEVER full suite while developing."
- Clear separation between development testing (single file) and validation testing (full suite)

### What v5 needs
1. **Incremental test development rule** template
2. Guidance: write small batches → run immediately → fix → repeat
3. Separate commands for development testing vs validation testing

---

## Gap 9: Blocker Chain Tracking

### What v4 provides
- Task management with status (todo, in-progress, done)
- No dependency tracking between tasks
- No cascade impact analysis

### What projects built
- **UzEngine**: Phase-based task organization with explicit dependency ordering
- **TML**: Explicit blocker chain (B1→B6) with cascade impact multiplier

### What v5 needs
1. **Task dependency field** in task metadata
2. **Blocker chain visualization** — which tasks block the most downstream work
3. **Priority escalation rule** — tasks that unblock many others get elevated priority

---

## Gap 10: Token Optimization Rules

### What v4 provides
- No guidance on agent output verbosity
- No model-specific optimization

### What projects built
- **UzEngine**: AGENT_AUTOMATION.md with ~850 tokens saved per haiku task
- Rules: "Output code not explanation", "Minimal reports", "No markdown abuse", "Combine outputs"

### What v5 needs
1. **Token optimization template** for agent definitions
2. Calibrated by model tier:
   - haiku: maximum conciseness, "Done" responses, no tables
   - sonnet: moderate verbosity, brief summaries
   - opus: full verbosity allowed (context is cheaper relative to cost)

---

## Gap 11: Domain-Specific Quality Checklists

### What v4 provides
- Generic quality enforcement (lint, test, coverage)
- No domain-specific pre-flight checks

### What projects built
- **UzEngine shader-engineer**: 9-question pre-flight checklist (source file, constants, clamps, scale factors, approximations, parameters, defaults, runtime computation, hardcoded values)
- **UzEngine cpp-core-expert**: 11-question pre-flight checklist
- Both: "If question 1 cannot be answered → STOP and launch research agent first"

### What v5 needs
1. **Configurable pre-flight checklist** system
2. Domain templates: rendering, compiler, API, database, frontend
3. Injection into relevant agent definitions

---

## Gap 12: The "Never Deferred" Rule

### What v4 provides
- No explicit prohibition on deferring tasks
- Tasks can have "blocked" status

### What projects built
- **UzEngine**: `no-deferred.md` — "If a task is in tasks.md, it MUST be implemented. If a dependency doesn't exist, implement it first."
- **TML**: Same pattern in CLAUDE.md

### What v5 needs
1. **Anti-deferred directive** in standard templates
2. Alternative to "Deferred": implement dependency first, or explain why it's truly impossible
3. This prevents the accumulation of technical debt disguised as "Deferred — requires X"

---

## Summary: Gap Priority for v5

| Priority | Gap | Effort | Impact |
|----------|-----|--------|--------|
| **Critical** | Anti-shortcut directives (Gap 2) | Low | Highest |
| **Critical** | Agent specialization framework (Gap 1) | High | Highest |
| **Critical** | Rule modularization (Gap 3) | Medium | High |
| **High** | Model tier assignment (Gap 4) | Medium | High |
| **High** | Team coordination rules (Gap 6) | Low | High |
| **High** | Session continuity PLANS.md (Gap 7) | Low | Medium |
| **High** | Never-deferred rule (Gap 12) | Low | Medium |
| **Medium** | Data flow planning templates (Gap 5) | Medium | Medium |
| **Medium** | Incremental test development (Gap 8) | Low | Medium |
| **Medium** | Blocker chain tracking (Gap 9) | High | Medium |
| **Medium** | Token optimization rules (Gap 10) | Low | Medium |
| **Low** | Domain-specific checklists (Gap 11) | High | Medium |
