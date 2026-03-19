# Cross-Project Patterns

Patterns that emerged **independently** in both UzEngine and TML, confirming their universal value for large-project AI development.

---

## Pattern 1: Tiered Prohibition System

**UzEngine**: Top 6 Rules (highest precedence), Secondary Rules (in .claude/rules/), Standards Rules
**TML**: Tier 1 Absolute Prohibitions (UNACCEPTABLE), Tier 2 Mandatory Workflow Rules, Tier 3 Command Rules

### Why It Emerged
Flat rule lists don't work. When all rules have equal weight, AI agents violate the most important ones first (because they're usually the most constraining). Both projects independently discovered that rules need **explicit precedence tiers**.

### Universal Pattern
```
Tier 1: ABSOLUTE PROHIBITIONS — violation = rejected output
Tier 2: MANDATORY WORKFLOW — must follow process
Tier 3: STANDARDS — naming, formatting, conventions
```

### v5 Recommendation
Rulebook should generate CLAUDE.md with explicit tiered rules. Tier 1 rules should be repeated in every agent definition.

---

## Pattern 2: Reference Implementation Requirement

**UzEngine**: UE5 source at `W:\UE_5.6_Source`. Every property cited with `@source UE5 <file>:<line>`.
**TML**: Rust compiler as reference. `.sandbox/temp_<feature>.rs` + `.sandbox/temp_<feature>.tml` comparison.

### Why It Emerged
AI models hallucinate domain-specific math. Both projects found that relying on model knowledge for rendering formulas (UzEngine) or compiler codegen (TML) produced incorrect results. The only solution: force the AI to read the actual reference implementation before writing code.

### Universal Pattern
```
1. Identify authoritative reference (existing engine, reference compiler, spec)
2. Before implementing: read the reference implementation
3. After implementing: compare output with reference
4. Cite the reference source in code comments
```

### v5 Recommendation
Rulebook should support a `referenceSource` config:
```json
{
  "referenceSource": {
    "path": "W:\\UE_5.6_Source",
    "citationFormat": "@source UE5 <file>:<line>",
    "mandatoryFor": ["rendering", "physics", "audio"]
  }
}
```

---

## Pattern 3: Agent Specialization with Dedicated Memory

**UzEngine**: 43 agents, each with `.claude/agent-memory/<agent>/MEMORY.md`
**TML**: 20+ agents, each with `.claude/agent-memory/<agent>/MEMORY.md`

### Why It Emerged
Generic agents (researcher, implementer, tester) are insufficient for large codebases. A "C++ implementer" doesn't know the engine's ECS conventions, constant buffer layouts, or shader include paths. Each domain needs an agent that accumulates project-specific knowledge.

### Universal Pattern
```
Agent Definition:
1. Domain expertise description (what this agent knows)
2. Project-specific context (key files, conventions, patterns)
3. Mandatory checklists (questions to answer before returning code)
4. Memory directory (persists across sessions)
5. Model tier assignment (opus/sonnet/haiku)
```

### v5 Recommendation
Rulebook should generate domain-specific agent definitions based on detected project type:
- Game engine → shader-engineer, rhi-engineer, ecs-engineer
- Compiler → codegen-debugger, ir-optimizer, stdlib-engineer
- Web app → frontend-engineer, backend-engineer, api-designer
- Mobile → platform-specialist, ui-engineer, performance-engineer

---

## Pattern 4: No-Shortcuts Directive (Highest Priority)

**UzEngine**: "A stub is a lie that compiles." "Response time is IRRELEVANT."
**TML**: "Quality is everything. Response time is NOT important." "NEVER simplify logic."

### Why It Emerged
This is the single most frequently violated rule. AI agents default to:
1. Returning stubs with TODO comments
2. Simplifying complex logic
3. Skipping edge cases
4. Using approximations instead of correct algorithms
5. Delivering partial implementations

Both projects found this so problematic that it became their highest-priority directive, repeated in EVERY agent definition.

### Universal Pattern
The prohibition must be:
1. **Tier 1** (highest precedence)
2. **Explicit** (list exactly what's forbidden: TODOs, stubs, placeholders, approximations, partial implementations)
3. **Repeated** in every agent definition (not just CLAUDE.md)
4. **Positive alternative** ("Take as long as needed. Research first. Implement completely.")

### v5 Recommendation
This should be a **core template** that Rulebook injects into every generated CLAUDE.md and every agent definition, with project-specific adjustments.

---

## Pattern 5: Task Decomposition Rules

**UzEngine**: Max 1-2 files per sub-task. Each independently compilable. Build after each.
**TML**: Write 1-3 tests at a time. Test immediately. Never full files at once.

### Why It Emerged
AI agents lose accuracy when editing 3+ files in one pass. By the time the 4th file is being edited, context from the 1st file has been compressed away or hallucinated.

### Universal Pattern
```
When task touches 3+ files across subsystems:
1. STOP — do not start implementing
2. Create a planning document mapping all changes
3. Decompose into sub-tasks (max 1-2 files each)
4. Execute sub-tasks in dependency order
5. Build/test after each sub-task
```

### v5 Recommendation
Rulebook should generate a task decomposition rule calibrated to project complexity:
- Simple projects: no decomposition needed
- Medium projects: recommend decomposition for 3+ file changes
- Large projects: mandatory decomposition, planning documents required

---

## Pattern 6: Mandatory Model Tier Assignment

**UzEngine**: opus (shaders/C++/RHI), sonnet (tests/docs/TS/Lua), haiku (UE5 analysis/research)
**TML**: opus (codegen bugs/deep analysis), sonnet (tests/TML code/build), haiku (exploration/docs)

### Why It Emerged
Cost optimization. Running opus for every task is expensive and unnecessary. Research tasks (reading code, searching docs) don't need opus-level reasoning. Conversely, using haiku for complex codegen debugging produces poor results.

### Universal Pattern
```
opus:  Complex bugs, core architecture, domain-critical code
sonnet: Standard implementation, tests, build system, medium complexity
haiku:  Read-only research, documentation, codebase exploration (20x cheaper)
```

### v5 Recommendation
Rulebook should include a model assignment guide in generated agent definitions, with the mapping calibrated to task domain:
```
opus = tasks where incorrect output is costly (security, core logic, rendering math)
sonnet = tasks where correctness matters but domain is well-defined (tests, CRUD, configs)
haiku = tasks that are read-only or where output is immediately verifiable (search, docs)
```

---

## Pattern 7: Git Safety Directives

**UzEngine**: "Never switch branches. Multiple Claude tabs share the same working tree."
**TML**: "Forbidden: stash, rebase, reset, checkout --, revert, cherry-pick, merge, branch -D, push --force, clean -f."

### Why It Emerged
AI agents performing destructive git operations caused data loss and broke concurrent sessions. Both projects independently banned the same set of git commands.

### Universal Pattern
```
ALLOWED: git status, git diff, git log, git add, git commit, git blame
FORBIDDEN: git stash, git rebase, git reset, git checkout --, git revert,
           git cherry-pick, git merge, git branch -D, git push --force,
           git clean -f, git checkout <branch>, git switch
REQUIRES EXPLICIT APPROVAL: anything not in the allowed list
```

### v5 Recommendation
This exact list should be a standard Rulebook template. Current GIT.md is too permissive.

---

## Pattern 8: Sequential File Editing

**UzEngine**: "Edit files sequentially, one at a time."
**TML**: "Read file1 → Edit file1 → Read file2 → Edit file2. Never batch parallel reads before edits."

### Why It Emerged
Batch editing (read 5 files, then edit 5 files) causes stale state. By the time file 3 is being edited, files 1-2 may have changed the context that file 3 depends on.

### v5 Recommendation
Standard rule in all agent definitions: sequential file editing with verification after each edit.

---

## Pattern 9: Token Optimization for Cheap Agents

**UzEngine**: AGENT_AUTOMATION.md — "Output code, not explanation. Minimal reports. No markdown abuse. ~850 tokens saved per task."
**TML**: "NEVER write substantial code directly in main conversation." (implied — main conversation = opus, delegate to cheaper agents)

### Why It Emerged
Haiku agents have limited context. Verbose status reports (emoji tables, "Next Steps" sections, detailed quality check results) consume 500-1000 tokens that could be used for actual work.

### Universal Pattern
```
For haiku/sonnet agents:
- Output code, not explanation
- "Done" instead of detailed reports
- No emoji status tables
- No "Next Steps" sections
- Combine outputs into one response
```

### v5 Recommendation
Rulebook should include token optimization rules calibrated per model tier. Haiku agents get strict conciseness rules. Opus agents can be more verbose since context is cheaper relative to their cost.

---

## Pattern 10: Persistent Session Scratchpad (PLANS.md)

**UzEngine**: `.rulebook/PLANS.md` — read at session start for current task context
**TML**: `.rulebook/PLANS.md` — structured with `<!-- PLANS:CONTEXT -->`, `<!-- PLANS:TASK -->`, `<!-- PLANS:HISTORY -->` sections

### Why It Emerged
Conversation context is lost between sessions. Memory captures decisions and learnings, but not "what I was working on right now." PLANS.md fills this gap as a session scratchpad that persists.

### Universal Pattern
```
Session start: Read PLANS.md for context
During session: Update PLANS.md with current task and progress
Session end: Write summary to PLANS.md
Next session: Read PLANS.md to resume where left off
```

### v5 Recommendation
PLANS.md should be a first-class Rulebook feature with standardized structure:
```markdown
<!-- PLANS:CONTEXT:START -->
Current focus, active task, key decisions
<!-- PLANS:CONTEXT:END -->
<!-- PLANS:TASK:START -->
Current task details, progress, blockers
<!-- PLANS:TASK:END -->
<!-- PLANS:HISTORY:START -->
Recent session summaries (last 3-5)
<!-- PLANS:HISTORY:END -->
```

---

## Pattern 11: The "Never Delete" Directive

**UzEngine**: "NEVER run destructive deletions (`rm -rf`) in this repository"
**TML**: "ABSOLUTE PROHIBITION: NO `rm` COMMANDS. Cache backup system exists because deletions kept happening. DO NOT DELETE ANYTHING."

### Why It Emerged
AI agents repeatedly deleted important files (caches, backups, temp files) during cleanup. TML's wording reveals the history: "Cache backup system exists because deletions kept happening."

### Universal Pattern
All delete operations require explicit user authorization. No exceptions.

### v5 Recommendation
Standard Tier 1 prohibition in all generated CLAUDE.md files.

---

## Pattern 12: Domain-Specific Research Agents

**UzEngine**: `unreal-architect` (haiku) — reads UE5 source, produces analysis documents, never writes code
**TML**: `researcher` (haiku) — read-only codebase exploration, 20x cheaper than opus

### Why It Emerged
Research tasks (reading documentation, analyzing reference implementations, searching codebases) don't require expensive models. A cheap haiku agent can read 10,000 lines of UE5 source and produce a component spec for a fraction of the cost of opus.

### Universal Pattern
```
Research Agent:
- Model: haiku (cheapest)
- Permissions: read-only (no file writes)
- Output: analysis documents in docs/ directory
- Never writes production code
- Used as input for implementation agents
```

### v5 Recommendation
Every project should have at least one research agent (haiku) for codebase exploration and reference analysis.
