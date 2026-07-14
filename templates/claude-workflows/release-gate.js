export const meta = {
  name: 'release-gate',
  description:
    'Pre-release go/no-go gate. Runs build/type-check, full test suite + coverage, security audit, and docs freshness in parallel, then reports a single go/no-go verdict.',
  phases: [{ title: 'Checks' }, { title: 'Report' }],
}

const GATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'detail'],
  properties: {
    pass: { type: 'boolean' },
    detail: { type: 'string', description: 'concise evidence: command output summary, numbers, or the blocking reason' },
  },
}

const GATES = [
  {
    key: 'build',
    model: 'sonnet',
    prompt:
      'Run the project type-checker and build (e.g. `npm run type-check` then `npm run build`). pass=true only if both succeed with zero errors. Report the outcome.',
  },
  {
    key: 'tests',
    model: 'sonnet',
    prompt:
      'Run the full test suite with coverage (e.g. `npm run test:coverage`). pass=true only if 100% of tests pass AND coverage meets the project threshold (≥95%). Report pass rate and coverage %.',
  },
  {
    key: 'security',
    model: 'haiku',
    prompt:
      'Run a production dependency audit (e.g. `npm audit --production`) and scan the diff for committed secrets. pass=true only if there are no high/critical vulnerabilities and no leaked secrets. Report findings.',
  },
  {
    key: 'docs',
    model: 'haiku',
    prompt:
      'Verify release docs are current: CHANGELOG.md has entries for the unreleased changes and README reflects any public API changes. pass=true only if docs are up to date. Report gaps.',
  },
]

phase('Checks')
const results = await parallel(
  GATES.map((g) => () =>
    agent(g.prompt, { label: `gate:${g.key}`, phase: 'Checks', model: g.model, schema: GATE_SCHEMA }).then(
      (r) => ({ key: g.key, pass: !!(r && r.pass), detail: (r && r.detail) || 'no result' })
    )
  )
)

const gates = results.filter(Boolean)
const go = gates.length === GATES.length && gates.every((g) => g.pass)

phase('Report')
log(go ? '✅ GO — all gates passed.' : `⛔ NO-GO — failing: ${gates.filter((g) => !g.pass).map((g) => g.key).join(', ')}`)

return { go, gates }
