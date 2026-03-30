# Proposal: mcp-stability-fixes

## Why
O MCP server estava em loop infinito de restart devido ao BackgroundIndexer poluindo stdout com `console.log` (quebrando o protocolo JSON-RPC stdio). Adicionalmente, o `migrateConfig()` usava `dirname(configPath)` ao invés de `this.projectRoot`, criando diretórios nested `.rulebook/.rulebook`. O plugin do Claude Code acumulava entradas duplicadas a cada versão publicada.

## What Changes
- `BackgroundIndexer`: `console.log` → `console.error` (3 locais) para não poluir stdout
- `BackgroundIndexer`: Adicionado extensões SQLite WAL/SHM/journal no ignore list do file watcher
- `ConfigManager.migrateConfig()`: Corrigido para usar `this.projectRoot` ao invés de `dirname(this.configPath)`
- `commands.ts` (init): Adicionado cleanup de `.rulebook/.rulebook` nested directory
- `setupClaudeCodePlugin()`: Deduplica entradas — mantém exatamente 1 por plugin key, atualiza versão in-place
- Removido increment desnecessário do `install-counts-cache.json`

## Impact
- Affected code: `src/core/indexer/background-indexer.ts`, `src/core/config-manager.ts`, `src/cli/commands.ts`
- Breaking change: NO
- User benefit: MCP server estável sem restart loops, sem diretórios duplicados, sem plugins duplicados no Claude Code
