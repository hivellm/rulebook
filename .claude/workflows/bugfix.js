export const meta = {
  name: 'bugfix',
  description:
    'Research-first bug fix: root-cause the bug, write a regression test then fix it (TDD), and gate through a quality-gatekeeper verdict (loop max 2). Pass the bug report via args.',
  phases: [
    { title: 'Diagnose', model: 'haiku' },
    { title: 'Fix', model: 'sonnet' },
    { title: 'Verify', model: 'opus' },
  ],
}

const bug =
  args && typeof args === 'object' && args.bug
    ? args.bug
    : typeof args === 'string' && args.trim()
      ? args
      : null

if (!bug) {
  log('No bug description provided. Pass args: { bug: "..." } or a plain string.')
  return { error: 'missing-bug' }
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'regressionTestPresent', 'issues', 'summary'],
  properties: {
    pass: { type: 'boolean', description: 'true only if the bug is fixed at the root cause and covered by a passing regression test' },
    regressionTestPresent: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

phase('Diagnose')
const diagnosis = await agent(
  `Root-cause this bug. Research-first: do not guess. Read the relevant code, reproduce mentally, and cite the exact file:line where the defect lives and why it produces the symptom. Read-only.
Bug report: "${bug}"`,
  { label: 'diagnose', phase: 'Diagnose', model: 'haiku' }
)

const MAX_ROUNDS = 2
let verdict = null
let lastIssues = []

for (let round = 1; round <= MAX_ROUNDS; round++) {
  const fixPrompt =
    round === 1
      ? `Fix this bug at its root cause (TDD: write a FAILING regression test that reproduces the bug first, then fix until it passes).
Bug: "${bug}"
Root-cause analysis:
"""
${diagnosis}
"""
Do not mask the symptom — fix the cause. Run type-check + tests before finishing. Report files changed and the regression test added.`
      : `The quality gatekeeper REJECTED your fix. Address ONLY these issues:
${lastIssues.map((i, n) => `${n + 1}. ${i}`).join('\n')}
Re-run type-check + tests. Report what you changed.`

  const fix = await agent(fixPrompt, {
    label: `fix:round-${round}`,
    phase: 'Fix',
    model: 'sonnet',
  })

  phase('Verify')
  verdict = await agent(
    `Independently verify this bug fix. NO prior context — judge from evidence.
1. Run \`git --no-pager diff\` to see the change.
2. Confirm a regression test exists that fails WITHOUT the fix and passes WITH it (run the suite).
3. Confirm the fix targets the root cause, not the symptom, and introduces no regressions (type-check + full relevant tests).
Bug: "${bug}"
Developer report (verify, don't trust): """${fix}"""
Set pass=true only if the root cause is fixed and covered by a passing regression test.`,
    { label: `verify:round-${round}`, phase: 'Verify', model: 'opus', schema: VERDICT_SCHEMA }
  )

  if (verdict && verdict.pass) {
    log(`Fix verified on round ${round}.`)
    break
  }
  lastIssues = (verdict && verdict.issues) || ['Gatekeeper returned no verdict']
  log(`Round ${round} rejected: ${lastIssues.length} issue(s).`)
}

return {
  bug,
  diagnosis,
  passed: !!(verdict && verdict.pass),
  issues: verdict && verdict.pass ? [] : lastIssues,
  verdict: verdict && verdict.summary,
}
