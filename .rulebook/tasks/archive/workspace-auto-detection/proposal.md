# Proposal: workspace-auto-detection

## Why
Quando um usuário abre múltiplos projetos no mesmo VSCode workspace e roda `rulebook init` na raiz (ao invés de individualmente por projeto), o MCP server não funcionava porque iniciava em single-project mode sem encontrar `.rulebook` no diretório correto. Multi-root workspaces são comuns e o sistema precisa funcionar sem configuração manual do `--workspace` flag.

## What Changes
- `rulebook-server.ts`: Auto-detecta workspace config (workspace.json, .code-workspace, monorepo indicators) antes de inicializar e faz auto-switch para workspace mode
- `claude-mcp.ts`: `configureMcpJson()` aceita param `workspace` e adiciona `--workspace` flag; `setupClaudeCodeIntegration()` auto-detecta workspace para configurar `.mcp.json`
- `commands.ts` (init): Mostra hint quando detecta múltiplos projetos sugerindo `rulebook workspace init`
- `commands.ts` (update): `.mcp.json` existentes são upgradeados com `--workspace` automaticamente via `setupClaudeCodeIntegration()`

## Impact
- Affected code: `src/mcp/rulebook-server.ts`, `src/core/claude-mcp.ts`, `src/cli/commands.ts`
- Breaking change: NO
- User benefit: Multi-root VSCode workspaces e monorepos funcionam automaticamente sem configuração extra
