export const meta = {
  name: 'review-fanout',
  description:
    'Adversarial multi-dimension review of the current git diff (correctness, security, performance, tests). Each finding is independently verified before it survives, then synthesized into a prioritized report.',
  phases: [{ title: 'Review' }, { title: 'Verify' }, { title: 'Synthesize', model: 'sonnet' }],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'file', 'severity', 'detail'],
        properties: {
          title: { type: 'string' },
          file: { type: 'string', description: 'path:line of the issue' },
          severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] },
          detail: { type: 'string', description: 'what is wrong and why it matters' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['real', 'reason'],
  properties: {
    real: { type: 'boolean', description: 'true only if the finding is a genuine, reproducible problem' },
    reason: { type: 'string' },
  },
}

const DIMENSIONS = [
  {
    key: 'correctness',
    agentType: 'code-reviewer',
    model: 'sonnet',
    focus: 'logic errors, broken edge cases, incorrect error handling, and regressions',
  },
  {
    key: 'security',
    agentType: 'security-reviewer',
    model: 'haiku',
    focus: 'injection, secret leakage, unsafe deserialization, missing authz/validation, vulnerable patterns',
  },
  {
    key: 'performance',
    agentType: 'performance-engineer',
    model: 'sonnet',
    focus: 'N+1 patterns, accidental quadratic work, unnecessary allocations, blocking I/O on hot paths',
  },
  {
    key: 'tests',
    agentType: 'tester',
    model: 'sonnet',
    focus: 'missing test coverage for changed behavior, weak assertions, and untested edge cases',
  },
]

// Scoping, in priority order:
//   args.baseRef — review everything committed since this ref (`git diff <ref>..HEAD`).
//                  Preferred when the caller commits each unit of work (rulebook-driver).
//   args.paths   — review only these files in the uncommitted working-tree diff.
//   (neither)    — review the full uncommitted diff.
const baseRef = args && typeof args.baseRef === 'string' && args.baseRef ? args.baseRef : null
const scopePaths = !baseRef && args && Array.isArray(args.paths) && args.paths.length ? args.paths : null
const diffCmd = baseRef
  ? `git --no-pager diff ${baseRef}..HEAD`
  : scopePaths
    ? `git --no-pager diff -- ${scopePaths.join(' ')} ; git --no-pager diff --staged -- ${scopePaths.join(' ')}`
    : 'git --no-pager diff ; git --no-pager diff --staged'
const scopeNote = baseRef
  ? `Review ONLY the changes committed since ${baseRef} (this task's changeset). Ignore anything before that ref.`
  : scopePaths
    ? `Review ONLY these files (the caller's changeset): ${scopePaths.join(', ')}. Ignore changes in any other file.`
    : 'Review the full current diff.'

// Pipeline: each dimension's findings verify as soon as that dimension finishes —
// no barrier, so the fast haiku security pass is not blocked by the slower lenses.
const results = await pipeline(
  DIMENSIONS,
  (d) =>
    agent(
      `Review the current git diff for ${d.key} issues. Focus on: ${d.focus}.
${scopeNote}
Run \`${diffCmd}\` to see the changes. Report only issues introduced or exposed by this diff — not pre-existing debt.`,
      { label: `review:${d.key}`, phase: 'Review', agentType: d.agentType, model: d.model, schema: FINDINGS_SCHEMA }
    ),
  (review, d) =>
    parallel(
      (review.findings || []).map((f) => () =>
        agent(
          `Adversarially verify this ${d.key} finding. Try to REFUTE it. Read the relevant code at ${f.file}. Default to real=false if you cannot concretely confirm the problem.
Finding: ${f.title}
Detail: ${f.detail}`,
          { label: `verify:${d.key}`, phase: 'Verify', model: 'haiku', schema: VERDICT_SCHEMA }
        ).then((v) => ({ ...f, dimension: d.key, verdict: v }))
      )
    )
)

const confirmed = results
  .flat()
  .filter(Boolean)
  .filter((f) => f.verdict && f.verdict.real)

// blocking = verified findings severe enough to fail a gate (blocker/major).
// Consumers (e.g. rulebook-driver) feed these back to the implementer.
const blocking = confirmed.filter((f) => /^(blocker|major)$/i.test(f.severity || ''))

phase('Synthesize')
const report = await agent(
  `Synthesize a prioritized code-review report from these confirmed findings (already verified as real). Group by severity, give each a one-line fix recommendation, and lead with blockers.
${JSON.stringify(confirmed, null, 2)}`,
  { label: 'synthesize', phase: 'Synthesize', model: 'sonnet' }
)

return { confirmedCount: confirmed.length, confirmed, blocking, report }
