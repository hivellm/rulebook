---
name: debug
description: Systematic debugging workflow for bugs and test failures
model: sonnet
context: fork
agent: researcher
---
Debug the following issue: $ARGUMENTS

Steps:
1. Reproduce the issue by reading the error message or running the failing test
2. Read the relevant source code and trace the execution path
3. Form a hypothesis about the root cause
4. Search for similar patterns in the codebase that work correctly
5. Identify the exact root cause with file and line reference
6. Propose a minimal fix with explanation
