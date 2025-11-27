## 1. Setup e Detecção
- [ ] 1.1 Criar módulo `src/core/act-runner.ts` para gerenciar ACT
- [ ] 1.2 Implementar detecção de Docker (Windows, Linux, Mac)
- [ ] 1.3 Implementar detecção de ACT instalado
- [ ] 1.4 Criar funções para verificar se Docker daemon está acessível
- [ ] 1.5 Criar funções para verificar se Docker TCP está exposto (quando necessário)

## 2. Instalação Automática
- [ ] 2.1 Criar script de instalação do Docker (com instruções por plataforma)
- [ ] 2.2 Criar script de instalação do ACT (Windows, Linux, Mac)
- [ ] 2.3 Implementar fallback com instruções manuais quando instalação automática falhar
- [ ] 2.4 Adicionar validação pós-instalação

## 3. Comando CLI
- [ ] 3.1 Adicionar comando `rulebook test:act` ou `rulebook test:ci`
- [ ] 3.2 Implementar opções: `--workflow`, `--job`, `--event`
- [ ] 3.3 Adicionar flag `--setup` para instalação inicial
- [ ] 3.4 Adicionar flag `--verbose` para debug
- [ ] 3.5 Implementar tratamento de erros com mensagens claras

## 4. Scripts de Workflow
- [ ] 4.1 Criar script helper para rodar workflows específicos
- [ ] 4.2 Criar script para rodar todos os workflows de teste
- [ ] 4.3 Adicionar suporte para variáveis de ambiente do CI
- [ ] 4.4 Implementar detecção automática de workflows disponíveis

## 5. Documentação e Erros
- [ ] 5.1 Criar documentação sobre requisitos (Docker TCP, etc)
- [ ] 5.2 Adicionar mensagens de erro claras com soluções
- [ ] 5.3 Criar guia de troubleshooting
- [ ] 5.4 Adicionar exemplos de uso no README

## 6. Testes e Validação
- [ ] 6.1 Escrever testes para detecção de Docker/ACT
- [ ] 6.2 Escrever testes para instalação (mocks)
- [ ] 6.3 Escrever testes para execução de workflows
- [ ] 6.4 Validar funcionamento em Windows, Linux e Mac (quando possível)
