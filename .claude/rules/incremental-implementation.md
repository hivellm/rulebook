# Implement step by step, test each step, restart from scratch if stuck

# Incremental Implementation — Step by Step, Test Each Step

NEVER implement everything at once. Build incrementally, verify at every step, and restart from scratch when stuck.

## Required Process

1. **Understand** the full scope before writing any code
2. **Decompose** into the smallest possible steps
3. **Implement ONE step** at a time
4. **Test/verify** that step immediately (compile, run, test)
5. **Fix any errors** before moving to the next step
6. **Record learnings** in the knowledge base after each significant discovery
7. **Repeat** until complete

## The Restart Rule

If you have spent more than 3 failed attempts fixing the same error:

1. **STOP** — do not try a 4th variation of the same approach
2. **Analyze** what went wrong — write down root causes, not symptoms
3. **Record** the failed approach as an anti-pattern in the knowledge base
4. **Remove** the broken code completely — do not patch on top of patches
5. **Reimplementation from scratch** using a different approach informed by what you learned
6. **Test each step** of the new approach before proceeding

## Knowledge Base Integration

After every significant implementation:

1. **Check existing knowledge** before starting: `rulebook knowledge list` or search `.rulebook/knowledge/`
2. **Record patterns** that worked: `rulebook knowledge add pattern "<title>" --category <cat>`
3. **Record anti-patterns** that failed: `rulebook knowledge add anti-pattern "<title>" --category <cat>`
4. **Capture learnings** from debugging: `rulebook learn capture --title "<title>" --content "<content>"`

## Forbidden

- Implementing an entire feature in one pass without intermediate verification
- Spending more than 3 attempts fixing the same error with the same approach
- Patching broken code on top of broken code instead of restarting clean
- Ignoring the knowledge base — check it BEFORE implementing, update it AFTER
- Batching all tests to the end instead of testing each step

## Why

AI agents that implement everything at once produce cascading errors. One early mistake propagates through the entire implementation, and debugging becomes exponentially harder. Step-by-step with immediate verification catches errors at the source. When stuck, restarting from scratch with new knowledge is always faster than patching endlessly. The line between persistence and stubbornness is thin.

**"Slow is smooth, smooth is fast."**
