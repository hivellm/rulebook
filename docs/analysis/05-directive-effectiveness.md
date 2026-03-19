# Directive Effectiveness Ranking

Analysis of which directives had the most measurable impact on development quality and velocity across both projects.

---

## Methodology

Effectiveness is ranked by:
1. **Frequency of violation before the directive existed** (higher = more needed)
2. **Impact of violation** (cost of a single violation in wasted time/rework)
3. **Universality** (applies to all project types, not just domain-specific)
4. **Enforceability** (can be verified automatically or by agent self-check)

---

## Tier S: Transformative Directives

### S1: No Stubs/TODOs/Placeholders/Approximations

**Evidence**: Both projects made this their highest-priority rule. TML: "ABSOLUTE PROHIBITION". UzEngine: "A stub is a lie that compiles."

**Why it's S-tier**: Without this rule, AI agents consistently deliver 60-80% implementations with TODOs for the hard parts. The TODO never gets resolved because the context that produced it is gone by the next session. This single directive changes AI output quality more than any other.

**Violation cost**: Hours of rework. Each stub requires a future session to understand the original context and implement properly.

**Universality**: 10/10 — applies to every project type.

### S2: Reference Implementation Requirement

**Evidence**: UzEngine requires UE5 source reading. TML requires Rust IR comparison.

**Why it's S-tier**: Eliminates the #1 source of bugs in domain-specific code: AI hallucination of algorithms and constants. When the AI reads the actual reference, output quality jumps from ~70% correct to ~95% correct.

**Violation cost**: Days of debugging incorrect math/algorithms that "look right" but produce wrong results.

**Universality**: 7/10 — requires an available reference implementation. Not all projects have one.

### S3: Mandatory Agent Delegation (Never Write Code in Main Conversation)

**Evidence**: Both projects forbid writing substantial code in the main conversation. UzEngine: "ALWAYS Delegate to Specialist Agents." TML: "NEVER write substantial code directly in main conversation."

**Why it's S-tier**: Main conversation context is precious (opus cost). Delegating to specialist agents with appropriate models (sonnet/haiku) reduces cost 3-20x while maintaining quality through agent-specific expertise and memory.

**Violation cost**: Wasted opus tokens on tasks that sonnet/haiku could handle. No persistent agent memory.

**Universality**: 8/10 — most valuable for projects with 5+ distinct domains.

---

## Tier A: High-Impact Directives

### A1: Task Decomposition (Max 1-2 Files Per Sub-Task)

**Evidence**: Both projects enforce this independently. UzEngine uses systems-integration agent for decomposition. TML uses incremental test development (1-3 at a time).

**Why it's A-tier**: Directly prevents the most common cause of implementation errors: context overload from multi-file edits.

**Violation cost**: Incorrect edits in later files due to context compression of earlier files.

**Universality**: 9/10 — any project with multi-file changes benefits.

### A2: Sequential File Editing

**Evidence**: Both projects mandate sequential read→edit→read→edit, never batch reads.

**Why it's A-tier**: Prevents stale state bugs where file edits depend on other files' current state.

**Violation cost**: Compilation errors, inconsistent edits, wasted time fixing edit conflicts.

**Universality**: 10/10 — universal.

### A3: Git Safety (Explicit Allow-List)

**Evidence**: Both projects ban the same set of destructive git commands.

**Why it's A-tier**: Prevents data loss and session corruption (multiple Claude tabs sharing worktree).

**Violation cost**: Lost work, corrupted branches, broken concurrent sessions.

**Universality**: 10/10 — universal.

### A4: Never Delete Without Authorization

**Evidence**: Both projects have absolute prohibitions on `rm`. TML created a backup system after repeated unauthorized deletions.

**Why it's A-tier**: Prevents irreversible data loss. Caches, backups, and temp files are often more important than they appear.

**Violation cost**: Hours rebuilding deleted caches. Potential loss of irreplaceable data.

**Universality**: 10/10 — universal.

### A5: Model Tier Assignment

**Evidence**: Both projects assign opus/sonnet/haiku by task complexity.

**Why it's A-tier**: 3-20x cost savings without quality loss. Haiku research agents are 20x cheaper than opus.

**Violation cost**: Wasted budget (opus for research) or poor quality (haiku for complex bugs).

**Universality**: 9/10 — any project using multiple agents benefits.

---

## Tier B: Important Directives

### B1: Data Flow Planning Documents

**Evidence**: UzEngine has mandatory `dataflow-<feature>.md`. TML uses `.sandbox/` reproduction files.

**Why it's B-tier**: Critical for multi-subsystem projects but less applicable to single-stack projects.

**Violation cost**: Integration failures between subsystems (e.g., C++ CB offset doesn't match HLSL).

**Universality**: 6/10 — most valuable for multi-language/multi-subsystem projects.

### B2: Tiered Prohibition System

**Evidence**: Both projects independently created 3-tier rule hierarchies.

**Why it's B-tier**: Improves compliance with critical rules by making precedence explicit.

**Violation cost**: Critical rules violated because they're lost in a flat list.

**Universality**: 8/10 — any project with 10+ rules benefits.

### B3: Token Optimization for Cheap Agents

**Evidence**: UzEngine's AGENT_AUTOMATION.md saves ~850 tokens per haiku task.

**Why it's B-tier**: Meaningful cost savings and prevents context exhaustion in cheap agents.

**Violation cost**: Context exhaustion, wasted tokens on verbose status reports.

**Universality**: 7/10 — any project using haiku/sonnet agents.

### B4: Agent-Specific Pre-Flight Checklists

**Evidence**: UzEngine's shader-engineer has 9 questions; cpp-core-expert has 11 questions.

**Why it's B-tier**: Catches common omissions before code is submitted. Domain-specific.

**Violation cost**: Missing parameters, wrong defaults, uncited sources.

**Universality**: 6/10 — requires domain-specific checklists per agent type.

### B5: Team Coordination (File Ownership)

**Evidence**: Both projects mandate TeamCreate for 2+ agents with exclusive file ownership.

**Why it's B-tier**: Prevents edit conflicts in parallel agent work.

**Violation cost**: Merge conflicts, overwritten changes, build failures.

**Universality**: 7/10 — any project using parallel agents.

---

## Tier C: Valuable but Situational

### C1: Visual Verification (Screenshots)
- Specific to rendering/UI projects
- Base64 stdout is a clever optimization

### C2: GPU Debugging Protocol (RenderDoc/PIX)
- Specific to graphics projects
- Buffer visualization grid is a unique innovation

### C3: Rust-as-Reference IR Comparison
- Specific to compiler projects
- Generalizable as "compare your output with a reference compiler"

### C4: Lua API Parity
- Specific to engines with scripting layers
- Generalizable as "every API gets a binding"

### C5: IP Protection (Rewrite, Don't Copy)
- Specific to projects referencing commercial source
- Important but domain-specific

---

## Summary: Priority Order for v5

| Priority | Directive | Universal? | Effort to Implement |
|----------|-----------|-----------|-------------------|
| 1 | No stubs/TODOs/placeholders | Yes | Low (template) |
| 2 | Agent delegation requirement | Yes | Medium (agent framework) |
| 3 | Task decomposition rules | Yes | Low (template) |
| 4 | Git safety allow-list | Yes | Low (template) |
| 5 | Never delete without authorization | Yes | Low (template) |
| 6 | Sequential file editing | Yes | Low (template) |
| 7 | Model tier assignment | Yes | Medium (config) |
| 8 | Tiered prohibition system | Yes | Medium (template structure) |
| 9 | Reference implementation workflow | Configurable | Medium (config + template) |
| 10 | Data flow planning templates | Configurable | Medium (template) |
| 11 | Token optimization rules | Yes | Low (template) |
| 12 | Agent-specific checklists | Configurable | High (domain templates) |
| 13 | Team coordination rules | Yes | Low (template) |
| 14 | Per-agent persistent memory | Yes | High (infrastructure) |
| 15 | Session scratchpad (PLANS.md) | Yes | Low (template) |
