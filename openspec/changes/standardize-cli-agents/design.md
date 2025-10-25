# Design: Standardize CLI Agent Implementations

## Architecture

### Supported CLI Agents
1. **cursor-agent** (✅ Implemented)
   - Command: `cursor-agent -p --force --approve-mcps --output-format stream-json --stream-partial-output "PROMPT"`
   - Output: JSON stream with events (system, user, assistant, tool_call, result)
   - Parser: `src/agents/cursor-agent.ts`

2. **claude-code** (🔨 To Implement)
   - Command: `claude --headless "PROMPT"`
   - Output: To be documented from official CLI
   - Parser: `src/agents/claude-code.ts`

3. **gemini-cli** (🔨 To Implement)
   - Command: `gemini "PROMPT"`
   - Output: To be documented from official CLI
   - Parser: `src/agents/gemini-cli.ts`

### Parser Interface
All parsers must implement:
```typescript
export interface AgentStreamParser {
  onComplete(callback: () => void): void;
  isCompleted(): boolean;
  processEvent(event: AgentEvent): void;
  processLines(output: string): void;
  getResult(): ParsedResult;
}

export interface ParsedResult {
  success: boolean;
  text: string;
  toolCalls: Array<{
    type: 'read' | 'write' | 'bash';
    details: string;
    result?: string;
  }>;
  duration: number;
  sessionId: string;
}
```

### CLI Detection
```typescript
async detectAvailableTools(): Promise<CLITool[]> {
  const tools = [
    { name: 'cursor-agent', command: 'cursor-agent', available: false },
    { name: 'claude-code', command: 'claude', available: false },
    { name: 'gemini-cli', command: 'gemini', available: false },
  ];
  // ... detection logic
}
```

### Stream Processing Flow
```
┌─────────────┐
│ CLI Command │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ child_process   │
│ .spawn()        │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ stdout.on       │
│ ('data')        │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Line Buffering  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Agent Parser    │
│ .processEvent() │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Progress Display│
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Completion      │
│ Detection       │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Process         │
│ Termination     │
└─────────────────┘
```

## Implementation Strategy

### Phase 1: Research (Day 1)
- [ ] Research `claude-code` CLI documentation
- [ ] Research `gemini-cli` CLI documentation
- [ ] Document output formats and flags
- [ ] Create example commands and outputs

### Phase 2: Remove Deprecated (Day 1)
- [ ] Remove `cursor-cli` from detection
- [ ] Remove `claude-cli` from detection
- [ ] Remove `gemini-cli-legacy` from detection
- [ ] Update all method signatures
- [ ] Update tests

### Phase 3: Implement claude-code (Day 2)
- [ ] Create `src/agents/claude-code.ts` parser
- [ ] Implement stream parsing
- [ ] Add completion detection
- [ ] Add progress indicators
- [ ] Write unit tests
- [ ] Write integration tests

### Phase 4: Implement gemini-cli (Day 2)
- [ ] Create `src/agents/gemini-cli.ts` parser
- [ ] Implement stream parsing
- [ ] Add completion detection
- [ ] Add progress indicators
- [ ] Write unit tests
- [ ] Write integration tests

### Phase 5: Documentation (Day 3)
- [ ] Update README.md with all three agents
- [ ] Create `/docs/CLI_AGENTS.md` guide
- [ ] Add usage examples for each agent
- [ ] Document troubleshooting
- [ ] Update CHANGELOG.md

### Phase 6: Testing & Quality (Day 3)
- [ ] Run full test suite
- [ ] Verify 95%+ coverage
- [ ] Test with real AI tools
- [ ] Performance testing
- [ ] Update quality gates

## Migration Guide

### For Users
```bash
# Old (deprecated)
rulebook agent --tool cursor-cli

# New (supported)
rulebook agent --tool cursor-agent

# Old (deprecated)
rulebook agent --tool claude-cli

# New (supported)
rulebook agent --tool claude-code
```

### For Developers
- Remove any references to `cursor-cli`, `claude-cli`, `gemini-cli-legacy`
- Use standardized parser interface
- Follow existing `cursor-agent` implementation as reference

## Success Criteria
- ✅ All three agents have working parsers
- ✅ Real-time progress for all agents
- ✅ Automatic completion detection for all agents
- ✅ 95%+ test coverage maintained
- ✅ All quality gates pass
- ✅ Documentation complete and accurate

