---
name: /ralph-init
id: ralph-init
category: Ralph
description: Initialize Ralph autonomous loop for AI-driven task completion in a project.
---
<!-- RALPH:START -->
**Overview**
Ralph is an autonomous AI loop that iteratively solves tasks from a PRD (Product Requirements Document). It runs your AI tool (Claude, Cursor, Gemini) in a continuous loop, tracks iterations, and learns from execution results.

**Guardrails**
- Always initialize Ralph before running iterations
- Use `rulebook ralph status` to check initialization and loop state
- Set appropriate max iterations (5-20 recommended for most projects)
- Keep the AI tool consistent across iterations for learning continuity

**Prerequisites**
- Project must be initialized with `rulebook init`
- Git repository must be set up with a remote origin
- Current branch will be used as the base for Ralph work

**Steps**
1. **Initialize Ralph**:
   ```bash
   rulebook ralph init
   ```

2. **Interactive Setup**:
   - Select max iterations (number of attempts to complete tasks)
   - Choose AI tool: `claude` (recommended), `cursor`, or `gemini`
   - Creates `.rulebook/ralph/` directory with configuration and PRD

3. **Verify Initialization**:
   ```bash
   rulebook ralph status
   ```
   Should show:
   - `enabled: true`
   - `current_iteration: 0`
   - `max_iterations: <your choice>`
   - `ai_tool: <your choice>`

4. **Review Generated PRD**:
   - View `.rulebook/ralph/prd.json` for generated user stories
   - Each story has: `id`, `title`, `description`, `acceptanceCriteria`, `priority`, `passes`, `notes`
   - `passes: false` indicates pending stories

5. **Optional: Customize PRD**:
   - Edit user stories directly in `prd.json`
   - Adjust priorities, add acceptance criteria, refine descriptions
   - Ralph will track which stories are completed (`passes: true`)

**Output**
Ralph creates:
- `.rulebook/ralph/prd.json` - The product requirements document
- `.rulebook/ralph/config.json` - Loop configuration (max_iterations, ai_tool)
- `.rulebook/ralph/history/` - Directory for iteration records

**Next Steps**
After initialization, use:
- `rulebook ralph run` - Start the autonomous loop
- `rulebook ralph pause` - Pause ongoing iterations
- `rulebook ralph resume` - Resume paused loop
- `rulebook ralph status` - Check current state
- `rulebook ralph history` - View past iterations

**Troubleshooting**
- **Init hangs**: Check git remote is properly configured (`git remote -v`)
- **PRD not generated**: Ensure project has valid task/context for Ralph to work with
- **Configuration lost**: Check `.rulebook/ralph/config.json` exists

<!-- RALPH:END -->
