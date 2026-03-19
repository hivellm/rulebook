# Cross-Project Analysis: UzEngine & TML

**Date**: 2026-03-19
**Purpose**: Deep analysis of AI-assisted development techniques from two large-scale projects to inform Rulebook v5
**Author**: Claude Opus 4.6 (automated analysis)

## Reports

| # | Report | Description |
|---|--------|-------------|
| 1 | [01-executive-summary.md](01-executive-summary.md) | Key findings, cross-project patterns, and v5 impact areas |
| 2 | [02-uzengine-analysis.md](02-uzengine-analysis.md) | UzEngine (game engine) — full directive and technique analysis |
| 3 | [03-tml-analysis.md](03-tml-analysis.md) | TML (programming language) — full directive and technique analysis |
| 4 | [04-cross-project-patterns.md](04-cross-project-patterns.md) | Patterns that emerged independently in both projects |
| 5 | [05-directive-effectiveness.md](05-directive-effectiveness.md) | Which directives had the most impact and why |
| 6 | [06-gap-analysis.md](06-gap-analysis.md) | What Rulebook v4 is missing based on real-world usage |
| 7 | [07-v5-recommendations.md](07-v5-recommendations.md) | Propostas concretas para Rulebook v5 (multi-tool: Claude Code, Cursor, Gemini, Codex, Windsurf, Copilot) |

## Project Scale

| Metric | UzEngine | TML |
|--------|----------|-----|
| **Type** | Game engine (DX11/DX12/Vulkan/Metal) | Programming language + compiler |
| **Primary Language** | C++23, HLSL, Lua | C++ (compiler), TML (stdlib) |
| **Codebase Size** | Large (~300K+ LOC) | Very large (~700K+ LOC) |
| **Agent Definitions** | 43 specialized agents | 20+ specialized agents |
| **Rule Files** | 17 rule files in .claude/rules/ | Embedded in CLAUDE.md (599 lines) |
| **Active Tasks** | ~10 active, ~30 archived | ~29 active, ~60 archived |
| **Archived Tasks** | Phase-based (0.x → 4.x) | Date-prefixed |
| **Reference Source** | UE5 source (W:\UE_5.6_Source) | Rust compiler (rustc --emit=llvm-ir) |
| **MCP Integration** | Rulebook MCP server | Native TML MCP server (14 tools) |
| **Build System** | Zig CC + CMake | Zig CC + CMake + Ninja |
