# Background Indexer & Vector Base

O **Background Indexer** do Rulebook é uma ferramenta invisível que transforma repositórios de qualquer tamanho em um banco de dados vetorial e grafo semântico, de forma 100% autônoma.

## Por que foi criado?
Anteriormente, as ferramentas de IA dependiam de inputs baseados estritamente na navegação do desenvolvedor ou ferramentas explícitas de listagem de diretório. Com o Background Indexer, todo o contexto do código, suas lógicas internas (classes, funções) e dependências (imports) são mapeados continuamente em tempo-real.

Isso dá ao Rulebook um contexto massivo e consultável sobre a base de código inteira que o MCP (`rulebook_codebase_search`) pode alavancar instantaneamente.

## Como Funciona

1. **Watch Contínuo**: O daemon nativo do Node.js monitora a raiz do projeto e identifica `add`, `change`, `unlink`.
2. **Ignorador Inteligente**: Arquivos grandes e diretórios como `node_modules` e `.git` são automaticamente filtrados, junto aos patterns especificados no `.gitignore`.
3. **AST Híbrido & Naive Chunking**:
   - Para arquivos em TypeScript, o Indexer extrai blocos contendo `classes` e `functions` e determina the arestas do grafo baseadas em `imports`.
   - Para outros arquivos ou `.md`, são gerados "chunks" otimizados.
4. **Debounce Optimization**: Modificações no file system sofrem delay (debounce) controlados através de filas assíncronas para não inundar o SQLite / HNSW.
5. **Memory DB**: O motor insere representações em vector (embeddings TF-IDF) associadas e permite buscas contextuais profundas através da ferramenta do Model Context Protocol `rulebook_codebase_search`.

## Inicialização e Troubleshooting

O Indexer é automaticamente ligado quando se inicializa o sistema Memory do Rulebook via Config Manager e se você inicia o Servidor MCP pelo repositório host:

\`\`\`bash
rulebook mcp start
\`\`\`

Logs do daemon aparecerão no console. Caso algo precise ser reinicializado:
- Excluir o arquivo criado em `.rulebook/memory/memory.db`.
- Reiniciar o Rulebook server.
