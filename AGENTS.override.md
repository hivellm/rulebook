<!-- OVERRIDE:START -->
# Project-Specific Overrides

Add your custom rules and team conventions here.
This file is never overwritten by `rulebook init` or `rulebook update`.

## Execution Style — Full Task, No Baby Steps

**CRITICAL**: When the user gives you a task, execute it COMPLETELY in one go. Do not break it into "step 1, await confirmation, step 2, await confirmation". Do not ask for permission to proceed between sub-steps that are obviously part of the same request.

### Required behavior

- **Execute the full task end-to-end** — read, plan, edit, test, commit (when asked) — in a single turn
- **Make decisions autonomously** for anything within the scope of what was requested
- **Only ask the user** when there is a genuine ambiguity that changes the outcome (not "should I proceed?", but "do you want X or Y, because they produce different results")
- **No "want me to continue?" prompts** between obviously-related sub-steps
- **No mid-task summaries asking for approval** — just keep going until done

### Forbidden patterns

- ❌ "I've done step 1. Should I proceed with step 2?"
- ❌ "Want me to also update the tests?"
- ❌ "Should I commit this now?" (unless commit was not part of the original request)
- ❌ "Let me know if you'd like me to continue"
- ❌ Doing one file edit and then stopping to confirm before editing the next related file
- ❌ Breaking a multi-file refactor into one-file-per-turn

### Required patterns

- ✅ Read the full request, plan internally, execute completely
- ✅ Run the full quality gate pipeline (lint + type-check + test + commit if applicable) without stopping to ask
- ✅ When 3+ files need editing, edit them all in sequence in the same turn
- ✅ Report ONCE at the end with what was done

### When asking IS appropriate

- Genuine ambiguity that changes the result (e.g. "you said 'fix the bug' — there are 2 bugs in this file, which one?")
- Destructive operations not explicitly authorized (deletes, force pushes, etc.)
- When the task as stated is impossible and you need a different approach

**The user is busy. Stop interrupting them with confirmations for work they already asked for.**


<!-- MIGRATED-FROM-CLAUDE-MD on 2026-04-07T21:35:42.076Z by rulebook v5.3.0 -->
