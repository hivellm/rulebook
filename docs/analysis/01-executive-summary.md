# Executive Summary: Cross-Project Analysis

**Date**: 2026-03-19

## Overview

This analysis examines two large-scale, AI-assisted projects — **UzEngine** (a game engine with DX11/DX12/Vulkan/Metal backends) and **TML** (a complete programming language with LLVM compiler) — to extract patterns, techniques, and directives that should inform **Rulebook v5**.

Both projects independently evolved sophisticated AI development workflows from the same Rulebook v4 base. The convergent patterns represent battle-tested solutions to real problems encountered when using AI agents on large, complex codebases.

## Key Finding: The 7 Pillars of Large-Project AI Development

Both projects independently converged on these 7 fundamental pillars:

### 1. Reference-First Development (NEVER Guess)
- **UzEngine**: Mandatory UE5 source reading before ANY rendering code. `@source UE5 <file>:<line>` citations required.
- **TML**: Mandatory Rust-as-Reference IR methodology. Write equivalent Rust code, compare LLVM IR side-by-side.
- **Pattern**: Large projects need an authoritative reference implementation. AI models hallucinate when relying on training data for domain-specific math/algorithms.

### 2. Specialized Agent Army with Dedicated Memory
- **UzEngine**: 43 agents (shader-engineer, cpp-core-expert, rhi-engineer, unreal-architect, etc.) with per-agent memory directories.
- **TML**: 20+ agents (codegen-debugger, tml-library-engineer, test-coverage-guardian, etc.) with per-agent memory.
- **Pattern**: Large projects need domain-expert agents, not generalists. Each agent accumulates project-specific knowledge across sessions.

### 3. Mandatory Model Tier Assignment
- **UzEngine**: opus for shaders/C++/RHI, sonnet for tests/docs, haiku for UE5 analysis/research.
- **TML**: opus for codegen bugs/deep analysis, sonnet for tests/TML code, haiku for exploration.
- **Pattern**: Cost-optimized model selection by task complexity. Haiku for read-only research, opus only for the hardest problems.

### 4. Absolute Prohibition on Stubs/TODOs/Approximations
- **UzEngine**: "A stub is a lie that compiles." No TODOs, no placeholders, no simplified logic.
- **TML**: "Quality is everything. Response time is NOT important." No shortcuts, stubs, or reduced scope.
- **Pattern**: AI agents will take shortcuts unless explicitly forbidden. This is the single most impactful directive.

### 5. Data Flow Planning Before Multi-File Implementation
- **UzEngine**: Mandatory `dataflow-<feature>.md` documents mapping UE5 → UzEngine pipeline before touching code.
- **TML**: `.sandbox/repro_<feature>.tml` + `.sandbox/repro_<feature>.rs` for side-by-side comparison before fixing.
- **Pattern**: Context windows compress away critical details when juggling 3+ files. Planning documents persist.

### 6. Task Decomposition to 1-2 Files Per Sub-Task
- **UzEngine**: "Each sub-task modifies at most 1-2 files in the same subsystem."
- **TML**: "Write tests 1-3 at a time, NOT entire files. Test immediately after writing."
- **Pattern**: AI agents lose accuracy when editing many files in one pass. Small, focused edits succeed.

### 7. Blocker Chain Tracking with Cascade Impact
- **UzEngine**: Phase-based task organization (Phase 0 → Phase 4) with explicit dependency ordering.
- **TML**: Explicit blocker chain (B1→B6) with cascade impact analysis. B1 blocks entire milestones.
- **Pattern**: Projects need visible dependency maps showing which bugs/tasks block the most downstream work.

## Critical Gap: What Rulebook v4 Does NOT Provide

| Gap | Impact | Both Projects Had to Build This |
|-----|--------|--------------------------------|
| **Agent definitions with domain expertise** | Agents are generic; projects need specialists | 43 agents (UzEngine) / 20+ agents (TML) |
| **Per-agent persistent memory** | No mechanism for agents to remember across sessions | `.claude/agent-memory/<agent>/MEMORY.md` |
| **Reference implementation workflow** | No guidance for "check authoritative source before coding" | UE5 source protocol / Rust-as-Reference IR |
| **Data flow planning templates** | No multi-file planning tools | `dataflow-<feature>.md` template |
| **Task decomposition rules** | No guidance on max files per task | 1-2 file limit per sub-task |
| **Model tier assignment** | No cost-optimization guidance | opus/sonnet/haiku assignment tables |
| **Visual verification workflow** | No rendering validation | `--screenshot-stdout`, base64, headless mode |
| **Anti-shortcut directives** | Default rulebook doesn't forbid stubs/TODOs strongly enough | Tier 1 absolute prohibitions |
| **Token optimization for haiku agents** | No guidance on keeping agent output concise | AGENT_AUTOMATION.md token-saving rules |
| **Team coordination rules** | Basic multi-agent support, no file ownership rules | TeamCreate + file ownership + SendMessage protocol |
| **Incremental test development** | No guidance on test batch size | 1-3 tests at a time, never full files |
| **Session scratchpad (PLANS.md)** | Context lost between sessions | PLANS.md with structured sections |

## Impact Assessment for v5

### Must-Have (Critical for large projects)
1. Agent specialization framework with domain expertise templates
2. Per-agent persistent memory system
3. Anti-shortcut directives (Tier 1 prohibitions)
4. Task decomposition rules (max files per sub-task)
5. Model tier assignment table
6. Team coordination with file ownership

### Should-Have (High value)
7. Reference implementation workflow templates
8. Data flow planning templates
9. Token optimization rules for cost-efficient agents
10. Incremental test development rules
11. Session scratchpad (PLANS.md) integration

### Nice-to-Have (Domain-specific)
12. Visual verification workflow (rendering projects)
13. GPU debugging protocol (graphics projects)
14. IR comparison methodology (compiler projects)

## Critical Insight: Tool-Agnostic Design

Both projects used Claude Code exclusively. But the **directives** they created are universal — they work with any LLM. The difference is only in how they're delivered:

| Capability | Claude Code | Cursor | Gemini/Codex/Others |
|------------|------------|--------|---------------------|
| Tier 1 Prohibitions | CLAUDE.md + agent defs | .cursor/rules/*.mdc | GEMINI.md / AGENTS.md |
| Agent Specialization | .claude/agents/ | Contextual rules (file-pattern) | Inline conditional sections |
| Persistent Memory | agent-memory/ + MCP | MCP only | MCP or PLANS.md |
| Multi-agent | Teams + SendMessage | N/A → sequential workflow | N/A → sequential workflow |
| Quality Gates | Pre-commit hooks | Pre-commit hooks | Pre-commit hooks |

**Rulebook v5 must generate the same quality directives for ALL tools**, with graceful degradation when tool-specific features aren't available.

## Conclusion

Both projects demonstrate that Rulebook v4 provides a good foundation but is insufficient for large, complex codebases. The gap between "template-generated AGENTS.md" and "production-ready AI development workflow" required 17+ rule files (UzEngine) or 599 lines of custom CLAUDE.md (TML) to bridge.

Rulebook v5 should:
1. **Codify these battle-tested patterns** as first-class features
2. **Be tool-agnostic** — same directives, adapted per tool format
3. **Use a canonical source** (`.rulebook/rules/`) with projections to each tool
4. **Degrade gracefully** — agents for Claude Code, contextual rules for Cursor, inline sections for others
5. **Leverage MCP** as the universal cross-tool integration layer
