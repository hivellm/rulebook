---
name: /ralph-history
id: ralph-history
category: Ralph
description: View past Ralph iterations, quality check results, and learnings.
---
<!-- RALPH:START -->
**Overview**
Review detailed records of all Ralph iterations, including:
- Task completion status
- Quality gate results (type-check, lint, tests, coverage)
- Execution time and performance metrics
- Errors encountered and learnings discovered
- Git commits associated with each iteration

**Guardrails**
- History is automatically recorded by Ralph during execution
- Read-only view - use to analyze and debug past iterations
- Useful for identifying patterns in failures or learning opportunities
- Each iteration is stored separately for audit trail

**Steps**
1. **View All Iterations**:
   ```bash
   rulebook ralph history
   ```
   Shows summary of all iterations with status and task info

2. **View Latest Iterations**:
   ```bash
   rulebook ralph history --limit 5
   ```
   Shows most recent N iterations (useful for large iteration counts)

3. **View Specific Iteration**:
   ```bash
   rulebook ralph history --iteration 3
   ```
   Shows detailed information for iteration 3

4. **Export History**:
   ```bash
   rulebook ralph history --export history.json
   ```
   Exports full iteration history for analysis

**Iteration Record Fields**
Each iteration record contains:
- **Metadata**:
  - Iteration number
  - Timestamp
  - Task ID and title
  - AI tool used
  - Execution time (ms)
  - Status: success / partial / failed

- **Quality Checks**:
  - type-check: TypeScript compilation result
  - lint: ESLint check result
  - tests: Test suite result
  - coverage_met: Coverage threshold result

- **Output**:
  - output_summary: Summary of what was done
  - learnings: Insights discovered during iteration
  - errors: Any errors encountered

- **Git**:
  - git_commit: Commit hash if changes were committed
  - branch: Branch used for this iteration

**Analyzing History**
1. **Success Rate**:
   ```bash
   # Successful iterations / total iterations
   # Shows loop health and AI tool effectiveness
   ```

2. **Quality Gate Patterns**:
   - Check which gates fail most often
   - Identify systematic issues (e.g., always failing lint)
   - Plan improvements based on failure patterns

3. **Learnings Extraction**:
   - Ralph records lessons learned from each iteration
   - Use these to improve task definitions or AI prompts
   - Share with team for knowledge base

4. **Performance Metrics**:
   - Track execution time per iteration
   - Identify slow tasks or AI tools
   - Optimize based on trends

**Location**
- Iteration records stored in: `.rulebook/ralph/history/`
- Each file named: `iteration-<N>.json`
- Full history also available in: `.rulebook/ralph/history-all.json`

**Using History for Debugging**
1. **Failed iteration**: Check error field for root cause
2. **Partial success**: Review which quality gates failed
3. **Slow iteration**: Check execution_time_ms
4. **Pattern analysis**: Compare multiple iterations for trends

**Next Steps**
- After reviewing history, fix issues and retry: `rulebook ralph run`
- Save learnings to persistent memory: `rulebook memory save "learning from iteration" ...`
- Update PRD based on discoveries from history analysis

<!-- RALPH:END -->
