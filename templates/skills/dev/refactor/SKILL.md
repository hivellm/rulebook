---
name: refactor
description: Identify code smells and execute safe refactorings
model: sonnet
context: fork
agent: refactoring-agent
---
Analyze and refactor the specified code.

Target: $ARGUMENTS (file path, module, or area to refactor)

Steps:
1. Read the target code and understand its purpose
2. Identify code smells (long functions, duplication, high complexity)
3. Propose specific refactorings with rationale
4. Implement refactorings one at a time, verifying tests pass after each
5. Report what was changed and why
