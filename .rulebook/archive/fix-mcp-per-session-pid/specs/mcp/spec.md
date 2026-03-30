# Spec: MCP Per-Session PID Lock

## Current Behavior (Broken)

```
acquirePidLock(projectRoot):
  1. Read .rulebook/mcp-server.pid
  2. If PID alive → process.exit(0)  ← BLOCKS second instance
  3. If dead → overwrite with our PID
```

## New Behavior

```
acquirePidLock(projectRoot):
  1. Clean stale PID files (scan .rulebook/mcp-server.*.pid, remove dead)
  2. Also clean legacy .rulebook/mcp-server.pid if present and stale
  3. Write .rulebook/mcp-server.<process.pid>.pid with our PID
  4. Return path to our PID file
  // NEVER exit — multiple instances are allowed

releasePidLock(pidPath):
  1. If file exists and contains our PID → delete it
  // Same as current, just new file naming

cleanStalePidFiles(projectRoot):
  1. Glob .rulebook/mcp-server.*.pid
  2. For each: read PID, check process.kill(pid, 0)
  3. If dead → delete file
  4. Also check legacy mcp-server.pid → if stale, delete
```

## File Changes

### `src/mcp/rulebook-server.ts`

SHALL export:
- `acquirePidLock(projectRoot: string): string` — returns path to session PID file
- `releasePidLock(pidPath: string): void` — removes own PID file
- `cleanStalePidFiles(projectRoot: string): void` — removes dead PID files

SHALL NOT:
- Call `process.exit()` when another instance is detected
- Use a single shared PID filename

### PID File Format

- **Old**: `.rulebook/mcp-server.pid` (content: PID number)
- **New**: `.rulebook/mcp-server.<pid>.pid` (content: PID number)
- Example: `.rulebook/mcp-server.12345.pid` contains `12345`

### Backward Compatibility

On startup, if legacy `.rulebook/mcp-server.pid` exists:
- If PID is dead → delete the file
- If PID is alive → leave it (that instance will clean up on its own shutdown)

## Orphan Protection

Orphan detection is NOT affected by this change. Each instance independently:
1. Monitors `stdin.on('end'/'close')` for client death
2. Polls `stdin.readable` every 30s (Windows safety net)
3. Calls `gracefulShutdown()` → `releasePidLock()` on any signal

This means orphan cleanup is per-instance, which is correct.
