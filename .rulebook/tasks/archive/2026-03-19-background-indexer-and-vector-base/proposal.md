# Proposal: background-indexer-and-vector-base

# Proposal: background-indexer-and-vector-base

## Why
O Rulebook precisa de uma fonte central e autônoma de contexto contínuo. Exigir que as IAs usem ferramentas para buscar conteúdos passivamente arquivo por arquivo quebra fluxos complexos e gasta tokens à toa. Ao ler todo o repositório em background construindo um Vector DB com laços do Grafo de Código, empoderamos os agentes a tomarem decisões altamente precisas sobre a arquitetura do projeto e evitar chamadas desnecessárias de leitura através de MCP.

## What Changes
- Criação de um `BackgroundIndexer` executando em loop leve vigiando o sistema de arquivos local.
- Criação de chunks baseados em AST (typescript/python) e parágrafos (markdown).
- Expansão do SQLite Memory interno (`memory-store.ts`) para incluir tabelas de metadados em grafos (`code_nodes` e `code_edges`).
- Adição de endpoints novos no MCP Master: `rulebook_codebase_search` e `rulebook_codebase_graph`.
- Injeção passiva dos vetores HNSW no índice existente.

## Impact
- Affected specs: MCP Server spec, Memory Manager spec
- Affected code: src/core/memory/*, src/mcp/rulebook-server.ts, src/core/indexer/* 
- Breaking change: NO
- User benefit: O AI CLI (Claude Code/Cursor) saberá magicamente onde estão os módulos, dependências e contextos da aplicação no milissegundo em que perguntar sobre a arquitetura, sem o usuário precisar abrir arquivos manualmente ou jogar paths na linha de comando.
