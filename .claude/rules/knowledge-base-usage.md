# Always use the knowledge base — read before implementing, write after learning

# Knowledge Base Usage — Mandatory for All Implementation Work

The knowledge base (`rulebook knowledge` + `rulebook learn`) is the project's institutional memory. It prevents repeating mistakes and ensures proven patterns are reused.

## BEFORE Starting Any Implementation

1. **Check existing knowledge**: `rulebook knowledge list`
2. **Search for relevant learnings**: `rulebook learn list`
3. **Apply patterns** that match your task — do NOT reinvent approaches that are already documented
4. **Avoid anti-patterns** — if a documented anti-pattern matches your planned approach, STOP and choose a different path

## DURING Implementation

When you discover something non-obvious:
- A workaround for a framework limitation → `rulebook learn capture`
- A debugging technique that saved time → `rulebook learn capture`
- A pattern that emerged and worked well → `rulebook knowledge add pattern`
- An approach that failed → `rulebook knowledge add anti-pattern`

## AFTER Completing a Task (before archive)

**Minimum 1 entry per task**. Record at least one of:
- `rulebook knowledge add pattern "<what worked>"` — reusable approach
- `rulebook knowledge add anti-pattern "<what failed>"` — approach to avoid
- `rulebook learn capture --title "<title>" --content "<insight>"` — implementation insight
- `rulebook decision create` — if a significant architectural choice was made

## Forbidden

- Starting implementation without checking `rulebook knowledge list`
- Archiving a task without capturing at least one learning
- Ignoring documented anti-patterns and repeating known mistakes
- Discovering a useful pattern and not recording it

## Why

Without the knowledge base, every session starts from zero. AI agents repeat the same mistakes, rediscover the same patterns, and waste cycles on approaches that were already tried and failed. The knowledge base is what makes the project smarter over time.

**"Those who cannot remember the past are condemned to repeat it."**
