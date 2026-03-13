# Proposal: add-context-intelligence-layer

## Why

Rulebook automates code standards and quality gates but lacks structured capture of **why** decisions were made, **what patterns** teams follow, and **what was learned** post-implementation. This knowledge lives in Slack, heads, or buried Ralph history files — invisible to AI assistants across sessions. Adding Decision Records, Knowledge Base, and Learn Phase closes the feedback loop between implementation and accumulated project intelligence.

Inspired by Context Mesh framework concepts (methodology-only, no tooling), adapted to Rulebook's automated CLI + MCP architecture.

## What Changes

### 1. Decision Records (`rulebook decision`)
- New `DecisionManager` class managing `.rulebook/decisions/NNN-<slug>.md` files
- Auto-numbered ADRs with status lifecycle (proposed → accepted → superseded/deprecated)
- CLI: `rulebook decision create|list|show|supersede`
- MCP: 4 new tools (`rulebook_decision_create|list|show|update`)
- Generator: new "Decision Records" section in AGENTS.md
- Memory: auto-save decisions for search

### 2. Knowledge Base (`rulebook knowledge`)
- New `KnowledgeManager` class managing `.rulebook/knowledge/patterns/` and `anti-patterns/`
- Explicit patterns/anti-patterns with category, examples, when to use/avoid
- CLI: `rulebook knowledge add|list|show|remove`
- MCP: 3 new tools (`rulebook_knowledge_add|list|show`)
- Generator: auto-inject "Project Knowledge" section into AGENTS.md on `rulebook update`

### 3. Learn Phase (`rulebook learn`)
- New `LearnManager` class as facade over memory + KnowledgeManager + DecisionManager
- Capture learnings manually or extract from Ralph iterations
- Promote learnings to patterns or decisions
- CLI: `rulebook learn capture|from-ralph|list|promote`
- MCP: 3 new tools (`rulebook_learn_capture|list|promote`)
- Task archive hook: prompt for learnings when archiving tasks

## Impact
- Affected specs: AGENTS.md generation, MCP server tool registry, CLI command registry
- Affected code: `types.ts`, `commands.ts`, `index.ts`, `rulebook-server.ts`, `generator.ts`, `prompts.ts`, `project-worker.ts`
- Breaking change: NO — all features are additive, opt-in
- User benefit: AI assistants gain access to project decisions, patterns, and learnings automatically; teams build institutional knowledge that survives across sessions and team members
