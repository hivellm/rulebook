export const meta = {
  name: 'feature-pipeline',
  description:
    'End-to-end feature delivery: research → architect → implement → test → review → document. Sequential because each stage depends on the previous one. Pass the feature description via args.',
  phases: [
    { title: 'Research', model: 'haiku' },
    { title: 'Design', model: 'fable' },
    { title: 'Implement', model: 'opus' },
    { title: 'Test', model: 'opus' },
    { title: 'Review', model: 'fable' },
    { title: 'Document', model: 'opus' },
  ],
}

// v7.4 model routing — every agent() call names its model explicitly:
//   fable = architecture, complex bugs, code review / verification
//   opus  = edits, tests, documentation, refactoring (never fable for simple work)
//   haiku = research, discovery, summaries
// sonnet is not part of the routing — do not reintroduce it.

const feature =
  args && typeof args === 'object' && args.feature
    ? args.feature
    : typeof args === 'string' && args.trim()
      ? args
      : null

if (!feature) {
  log('No feature description provided. Pass args: { feature: "..." } or a plain string.')
  return { error: 'missing-feature' }
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['pass', 'issues', 'summary'],
  properties: {
    pass: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

phase('Research')
const research = await agent(
  `Research the codebase to inform building this feature: "${feature}".
Identify the relevant files, existing patterns/conventions, reusable utilities, and risks. Read-only — do not modify anything. Report a concise, actionable map.`,
  { label: 'research', phase: 'Research', model: 'haiku' }
)

phase('Design')
const design = await agent(
  `Design the architecture for: "${feature}".
Use this codebase research as ground truth:
"""
${research}
"""
Produce a concrete implementation blueprint: files to create/modify, component/data design, and the build sequence. Follow existing conventions; flag trade-offs. Do not write production code yet.`,
  { label: 'design', phase: 'Design', model: 'fable' }
)

phase('Implement')
const impl = await agent(
  `Implement this feature following the design blueprint below. SDD: trace every behavior to the design; add nothing unspecified. TDD: write tests first where practical.
Feature: "${feature}"
Blueprint:
"""
${design}
"""
Run the type-checker before finishing. Report the files you created/changed.`,
  { label: 'implement', phase: 'Implement', model: 'opus' }
)

phase('Test')
const tests = await agent(
  `Write/extend tests for the feature just implemented ("${feature}"). Cover the new behavior and its edge cases with meaningful assertions (no boilerplate). Run \`git --no-pager diff\` to see what was implemented, write the tests, and run them until green. Report coverage of the new code.`,
  { label: 'test', phase: 'Test', model: 'opus' }
)

phase('Review')
const review = await agent(
  `Independently review the full diff for feature "${feature}". Run \`git --no-pager diff\`. Judge correctness, adherence to the design, edge cases, and test adequacy. Run type-check and tests to confirm green. Return pass=true only if it is genuinely ready to merge.
Implementation report: """${impl}"""
Test report: """${tests}"""`,
  { label: 'review', phase: 'Review', model: 'fable', schema: VERDICT_SCHEMA }
)

phase('Document')
const docs = await agent(
  `Document the feature "${feature}". Run \`git --no-pager diff\` to see what shipped. Update README.md (if user-facing) and add a conventional-commit CHANGELOG.md entry under the unreleased section. English only; document only what exists in the diff.`,
  { label: 'document', phase: 'Document', model: 'opus' }
)

return { feature, design, review, passed: !!(review && review.pass), docs }
