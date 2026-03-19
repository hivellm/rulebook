---
name: research-first
tier: 1
description: "Always research before implementing — never guess"
alwaysApply: true
filePatterns: ["*"]
tools: ["all"]
---

# Research Before Implementing

NEVER guess at bug causes, API behavior, or algorithm correctness.

## Required Process

1. **State what you KNOW** (from logs, debug output, code reading)
2. **State what you DON'T KNOW**
3. **Research** the unknown (read source, check docs, use diagnostic tools)
4. **Only then** implement the fix

## Forbidden

- Guessing at the cause of a bug
- "Trying things" to see if they work
- Hypothesizing without reading code
- Assuming how an API works without checking docs
- Iterating blindly — each attempt must be informed by new data

**"I think this might be the problem" is NOT acceptable.**
**"Source X does Y at file:line, we do Z, the difference causes W" IS acceptable.**
