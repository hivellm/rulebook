export const meta = {
  name: 'rulebook-driver',
  description:
    'Drain the rulebook backlog in a loop: discover the next unchecked task item, implement it, gate it through an independent SDD+TDD opus reviewer (max 3 rounds), document it, then move to the next item — until none remain, a item fails review, the item cap is hit, or the token budget runs low.',
  phases: [
    { title: 'Discover', detail: 'find first unchecked item (lowest phase)', model: 'haiku' },
    { title: 'Implement', detail: 'dev implements; independent opus reviewer gates; loop ≤3', model: 'sonnet' },
    { title: 'Review', detail: 'independent full SDD+TDD review', model: 'opus' },
    { title: 'Fanout', detail: 'review-fanout adversarial diff review per approved item' },
    { title: 'Document', detail: 'docs-writer updates README/CHANGELOG', model: 'haiku' },
    { title: 'Gate', detail: 'release-gate go/no-go once the backlog is drained' },
  ],
}

// ---- Tunables (override via args) ------------------------------------------
// args: { once?: boolean, maxItems?: number, minBudget?: number, fanoutRounds?: number }
//   once         — process a single item then stop (legacy one-shot behavior)
//   maxItems     — hard cap on items processed in one run (default 25 safety stop)
//   minBudget    — stop before the next item if remaining tokens fall below this
//   fanoutRounds — max review-fanout remediation rounds per completed task (default 2)
const opts = args && typeof args === 'object' ? args : {}
const ONCE = opts.once === true
const MAX_ITEMS = typeof opts.maxItems === 'number' ? opts.maxItems : 25
const MIN_BUDGET = typeof opts.minBudget === 'number' ? opts.minBudget : 60_000
const MAX_REVIEW_ROUNDS = 3
// Per-completed-task adversarial gate. Counted SEPARATELY from MAX_REVIEW_ROUNDS so a
// fanout finding never competes with the per-item SDD/TDD round budget.
const MAX_FANOUT_ROUNDS = typeof opts.fanoutRounds === 'number' ? opts.fanoutRounds : 2

// ---- Structured-output schemas --------------------------------------------

const TASK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['found', 'taskId', 'phase', 'item', 'specPaths', 'summary'],
  properties: {
    found: { type: 'boolean', description: 'true if an unchecked checklist item was found' },
    taskId: { type: 'string', description: 'task directory id; empty string if none' },
    phase: { type: 'string', description: 'phase the item belongs to; empty if none' },
    item: { type: 'string', description: 'exact text of the first unchecked "- [ ]" item' },
    specPaths: {
      type: 'array',
      items: { type: 'string' },
      description: 'paths to proposal.md, tasks.md and specs/**/spec.md for this task',
    },
    summary: { type: 'string', description: 'one-line description of what the item asks for' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'sddCompliant', 'tddCompliant', 'issues', 'summary'],
  properties: {
    pass: {
      type: 'boolean',
      description: 'true ONLY if correct, well-implemented, and both SDD and TDD are satisfied',
    },
    sddCompliant: {
      type: 'boolean',
      description: 'implementation satisfies every SHALL/MUST scenario in the spec, nothing unspecified added',
    },
    tddCompliant: {
      type: 'boolean',
      description: 'tests exist for the new behavior, were written for it, and actually run and pass',
    },
    issues: {
      type: 'array',
      items: { type: 'string' },
      description: 'concrete, actionable blocking problems; empty array when pass=true',
    },
    summary: { type: 'string', description: 'one-paragraph verdict rationale' },
  },
}

const FILES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['files'],
  properties: {
    files: {
      type: 'array',
      items: { type: 'string' },
      description: 'union of changed file paths from `git diff --name-only` and `--staged`',
    },
  },
}

// ---- Per-item pipeline ----------------------------------------------------

async function driveItem(task, itemIndex) {
  let verdict = null
  let lastIssues = []
  let passedRound = 0

  for (let round = 1; round <= MAX_REVIEW_ROUNDS; round++) {
    const devPrompt =
      round === 1
        ? `Implement this rulebook task item with strict SDD and TDD discipline.

Task: ${task.taskId} / ${task.phase}
Item: ${task.item}
Specs to satisfy (READ THESE FIRST): ${task.specPaths.join(', ')}

TDD: write the failing test(s) first, then the minimum implementation that makes them pass.
SDD: every behavior you add must trace to a SHALL/MUST scenario in the spec. Do NOT add unspecified features.
Before finishing: run the type-checker, then the relevant tests. Both must be green.
Report exactly which files you created/changed and which tests you added.`
        : `An independent reviewer REJECTED your previous attempt (round ${round - 1}). Fix ONLY these blocking issues; do not touch anything else:

${lastIssues.map((i, n) => `${n + 1}. ${i}`).join('\n')}

Re-run the type-checker and tests (both must pass). Report which files you changed and which tests you added or updated.`

    const dev = await agent(devPrompt, {
      label: `dev:item${itemIndex}:r${round}`,
      phase: 'Implement',
      agentType: 'typescript-implementer',
      model: 'sonnet',
    })

    // Independent reviewer — fresh subagent, NO conversation context, opus for a
    // thorough complete review. Sees only the git diff + the spec.
    verdict = await agent(
      `You are an INDEPENDENT senior reviewer with NO prior context. This is the FINAL quality gate — be exhaustive, judge ONLY from hard evidence, never trust the developer's claims without checking.

Steps:
1. Run \`git --no-pager diff\` and \`git --no-pager diff --staged\` to see exactly what changed.
2. Read the spec files: ${task.specPaths.join(', ')}
3. Judge on two axes:
   - SDD: does the diff satisfy EVERY SHALL/MUST scenario in the spec, with nothing unspecified bolted on?
   - TDD: are there tests covering the new behavior, and do they actually run and PASS? Run the test suite for the touched area to confirm.
4. Also verify correctness, edge cases, error paths, and that the type-checker passes.

The developer reported the following (verify it, do not take it at face value):
"""
${dev}
"""

Set pass=true ONLY when SDD and TDD are both fully satisfied and the code is correct. Otherwise return concrete, actionable blocking issues the developer can fix.`,
      {
        label: `review:item${itemIndex}:r${round}`,
        phase: 'Review',
        agentType: 'code-reviewer',
        model: 'opus',
        schema: VERDICT_SCHEMA,
      }
    )

    if (verdict && verdict.pass) {
      passedRound = round
      break
    }
    lastIssues = (verdict && verdict.issues) || ['Reviewer returned no verdict']
    log(`Item ${itemIndex} round ${round} rejected: ${lastIssues.length} issue(s).`)
  }

  if (!verdict || !verdict.pass) {
    return { passed: false, issues: lastIssues, verdict: verdict && verdict.summary }
  }

  const docs = await agent(
    `A rulebook task item was just implemented and passed independent SDD+TDD review.

Task: ${task.taskId} / ${task.phase}
Item: ${task.item}
Specs: ${task.specPaths.join(', ')}

Update the application documentation to reflect what shipped:
1. Run \`git --no-pager diff\` to see exactly what changed.
2. Update CHANGELOG.md with a conventional-commit-style entry under the unreleased section.
3. Update README.md only if public/user-facing behavior changed.
Keep all docs in English. Do not document behavior that is not present in the diff.
Report which documentation files you updated.`,
    { label: `document:item${itemIndex}`, phase: 'Document', agentType: 'docs-writer', model: 'haiku' }
  )

  return { passed: true, passedRound, review: verdict.summary, docs }
}

// Snapshot the set of changed files (via git). Used to scope each task's review-fanout
// to only that task's changeset, since the driver does not commit between items/tasks.
async function gitChangedFiles() {
  const r = await agent(
    'Run `git --no-pager diff --name-only` and `git --no-pager diff --name-only --staged`. Return the de-duplicated union of file paths, one per entry. Return an empty list if there are no changes.',
    { label: 'git-files', phase: 'Discover', agentType: 'researcher', model: 'haiku', schema: FILES_SCHEMA }
  )
  return (r && Array.isArray(r.files) ? r.files : []).filter(Boolean)
}

// ---- Per-task adversarial gate (review-fanout) -----------------------------
// Runs ONCE per completed task, not per item. Scoped (via paths) to that task's
// changeset. Blocking (blocker/major) findings are remediated by a dev agent and
// re-reviewed, up to MAX_FANOUT_ROUNDS. Returns { passed, rounds, blocking } —
// passed=false means the task could not be cleaned.
async function reviewFanoutGate(taskId, specPaths, paths) {
  const scope = paths && paths.length ? { paths } : undefined
  const scopeLabel = scope ? ` (scoped to ${paths.length} file(s))` : ''
  for (let fround = 1; fround <= MAX_FANOUT_ROUNDS; fround++) {
    phase('Fanout')
    log(`Task ${taskId}: review-fanout round ${fround}/${MAX_FANOUT_ROUNDS}${scopeLabel}…`)
    const fanout = await workflow('review-fanout', scope)
    const blocking = (fanout && fanout.blocking) || []

    if (blocking.length === 0) {
      log(`Task ${taskId}: review-fanout clean (round ${fround}).`)
      return { passed: true, rounds: fround, blocking: [] }
    }

    if (fround === MAX_FANOUT_ROUNDS) {
      log(`Task ${taskId}: still ${blocking.length} blocking issue(s) after ${fround} fanout round(s) — escalating.`)
      return { passed: false, rounds: fround, blocking }
    }

    const issues = blocking
      .map((f) => `[${f.severity}] ${f.file || ''} — ${f.title}: ${f.detail || ''} (${f.dimension || 'review'})`)
      .join('\n')
    log(`Task ${taskId}: review-fanout flagged ${blocking.length} blocking issue(s); remediating.`)
    await agent(
      `An independent adversarial review of task ${taskId} found blocking issues in the current diff. Fix ONLY these; do not touch anything else, and do not weaken or delete tests to make them pass:

${issues}

Specs that still must hold: ${(specPaths || []).join(', ') || '(see task directory)'}
Re-run the type-checker and the relevant tests (both must pass). Report which files you changed.`,
      { label: `fanout-fix:${taskId}:r${fround}`, phase: 'Fanout', agentType: 'typescript-implementer', model: 'sonnet' }
    )
  }
  return { passed: true, rounds: MAX_FANOUT_ROUNDS, blocking: [] }
}

// ---- Backlog loop ---------------------------------------------------------

const processed = []
const taskGates = []
let stopReason = 'backlog-drained'
let currentTaskId = null
let currentSpecPaths = []
let currentTaskBaseline = []
let halted = false

// Run the per-task review-fanout gate once, scoped to the task's changeset, and record it.
async function gateCompletedTask(taskId, specPaths, baseline) {
  const now = await gitChangedFiles()
  const baseSet = new Set(baseline || [])
  const paths = now.filter((f) => !baseSet.has(f))
  const gate = await reviewFanoutGate(taskId, specPaths, paths)
  taskGates.push({
    taskId,
    passed: gate.passed,
    rounds: gate.rounds,
    blockingCount: gate.blocking.length,
    scopedFiles: paths.length,
  })
  return gate
}

for (let i = 1; i <= MAX_ITEMS; i++) {
  if (budget.total && budget.remaining() < MIN_BUDGET) {
    stopReason = 'budget-low'
    log(`Stopping: ${Math.round(budget.remaining() / 1000)}k tokens left (< ${Math.round(MIN_BUDGET / 1000)}k).`)
    break
  }

  phase('Discover')
  const task = await agent(
    `You are discovering the NEXT rulebook task item to execute. Follow the project rule "follow-task-sequence": pick the FIRST unchecked "- [ ]" item from the LOWEST-numbered phase. Never reorder, never cherry-pick.

Steps:
1. Read .rulebook/STATE.md to find the active task id.
2. Open .rulebook/tasks/<active-task>/tasks.md (fall back to the lowest-numbered task directory if STATE.md is stale or the active task is fully checked).
3. Find the first "- [ ]" item, top to bottom.
4. Collect that task's spec material: proposal.md, tasks.md, and every specs/**/spec.md under the task directory.

Set found=false (and leave the other string fields empty) if every item in every task is already checked.`,
    { label: `discover:${i}`, phase: 'Discover', agentType: 'researcher', model: 'haiku', schema: TASK_SCHEMA }
  )

  if (!task || !task.found) {
    stopReason = processed.length ? 'backlog-drained' : 'no-pending-task'
    break
  }

  // Task boundary: a new taskId means the previous task is fully checked → gate it once,
  // then snapshot the new task's baseline file set so its gate is scoped to its own diff.
  if (task.taskId !== currentTaskId) {
    if (currentTaskId) {
      const gate = await gateCompletedTask(currentTaskId, currentSpecPaths, currentTaskBaseline)
      if (!gate.passed) {
        stopReason = 'task-fanout-failed'
        log(`Halting: task ${currentTaskId} failed the review-fanout gate.`)
        halted = true
        break
      }
    }
    currentTaskId = task.taskId
    currentSpecPaths = task.specPaths || []
    currentTaskBaseline = await gitChangedFiles()
  }

  log(`[${i}/${MAX_ITEMS}] ${task.taskId} / ${task.phase}: ${task.item}`)
  const result = await driveItem(task, i)
  processed.push({ taskId: task.taskId, phase: task.phase, item: task.item, ...result })

  if (!result.passed) {
    stopReason = 'item-failed-review'
    log(`Item ${i} failed after ${MAX_REVIEW_ROUNDS} rounds — halting loop (sequential tasks must not build on a broken item).`)
    halted = true
    break
  }

  if (ONCE) {
    stopReason = 'once'
    break
  }
  if (i === MAX_ITEMS) stopReason = 'max-items'
}

// Gate the final task only when the backlog drained cleanly (last task fully checked).
// Mid-task stops (once / max-items / budget-low) leave the task incomplete — skip the gate.
if (!halted && stopReason === 'backlog-drained' && currentTaskId) {
  const gate = await gateCompletedTask(currentTaskId, currentSpecPaths, currentTaskBaseline)
  if (!gate.passed) {
    stopReason = 'task-fanout-failed'
    halted = true
  }
}

const passed = processed.filter((p) => p.passed).length

// FINAL: one release-gate pass over the work completed this run. Skipped when we halted on a
// failure (broken state) or when nothing passed.
let releaseGate = null
if (passed > 0 && !halted) {
  phase('Gate')
  log(`Running release-gate over ${passed} completed item(s)…`)
  releaseGate = await workflow('release-gate')
  log(`release-gate: ${releaseGate && releaseGate.go ? 'GO ✅' : 'NO-GO ⛔'}`)
}

log(`Done: ${passed}/${processed.length} item(s) passed. Stop reason: ${stopReason}.`)

return { stopReason, processedCount: processed.length, passedCount: passed, processed, taskGates, releaseGate }
