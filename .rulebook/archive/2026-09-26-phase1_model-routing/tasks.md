## 1. Implementation
- [x] 1.1 Set the routed `model:` in every templates/agents/*.md frontmatter (fable/opus/haiku) with a routing comment
- [x] 1.2 Route every model in templates/claude-workflows/*.js (sonnet → opus; review/verify/critique/design → fable; docs → opus; research → haiku) and add a routing header comment
- [x] 1.3 Sync .claude/agents/*.md and .claude/workflows/*.js with the templates (keep placeholder substitutions)
- [x] 1.4 Confirm src/core/claude/claude-mcp.ts installers carry no hard-coded models or model filtering

## 2. Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (routing comments in agent frontmatter and workflow headers)
- [x] 2.2 Write tests covering the new behavior (tests/agent-model-routing.test.ts)
- [x] 2.3 Run tests and confirm they pass
