# Proposal: Add ACT Local Testing

## Why

Existem discrepâncias entre rodar testes localmente (WSL/PowerShell) e no GitHub Actions. Alguns projetos passam nos testes localmente mas falham no CI, causando frustração e retrabalho. O ACT (Action Container Toolkit) permite simular o ambiente do GitHub Actions localmente, detectando problemas antes do push. Esta feature é totalmente opcional e deve funcionar no Windows, Linux e Mac, com detecção automática de dependências e instruções claras para configuração.

## What Changes

Adicionar suporte opcional para rodar testes usando ACT, que simula o ambiente do GitHub Actions localmente. A implementação deve:

1. Detectar e instalar Docker (se não existir) com instruções claras
2. Detectar e instalar ACT (se não existir)
3. Criar scripts para rodar workflows do GitHub Actions localmente
4. Prever e avisar sobre requisitos (ex: expor daemon TCP do Docker)
5. Funcionar em Windows, Linux e Mac
6. Ser totalmente opcional (não quebrar se Docker/ACT não estiverem disponíveis)
7. Fornecer mensagens de erro claras e instruções de configuração

## Impact

- Affected specs: `specs/cli/spec.md` (novo comando), `specs/core/spec.md` (nova funcionalidade)
- Affected code: `src/cli/commands.ts` (novo comando), `src/core/act-runner.ts` (nova classe), scripts de instalação
- Breaking change: NO
- User benefit: Detecta problemas de CI antes do push, reduz retrabalho e frustração
