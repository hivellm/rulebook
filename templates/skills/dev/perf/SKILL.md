---
name: perf
description: Performance analysis, profiling, and optimization
model: sonnet
context: fork
agent: performance-engineer
---
Analyze performance for: $ARGUMENTS

If no arguments, do a general performance review of the project.

Steps:
1. Identify the performance bottleneck or area of concern
2. Profile the code (check for N+1 queries, unnecessary allocations, blocking I/O)
3. Benchmark the current performance baseline
4. Propose optimizations with expected impact
5. Implement the optimization and measure improvement
