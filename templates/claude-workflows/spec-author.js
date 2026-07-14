export const meta = {
  name: 'spec-author',
  description:
    'Help the user write a rulebook task spec: research the codebase + existing specs, draft a proposal + SHALL/MUST spec with Given/When/Then scenarios, then run an opus gap-critic that returns ranked clarifying questions and detected gaps for the user to answer. Iterates when prior answers are supplied via args.answers.',
  phases: [
    { title: 'Research', model: 'haiku' },
    { title: 'Draft', model: 'opus' },
    { title: 'Critique', model: 'opus' },
  ],
}

// args: { topic: string, answers?: Array<{ question: string, answer: string }> }
// NOTE: workflow subagents are non-interactive — this workflow cannot prompt the
// user mid-run. It RETURNS ranked questions/gaps; the main loop asks the user
// (e.g. via AskUserQuestion), then re-invokes this workflow with args.answers
// folded in. Repeat until `questions` comes back empty / `ready` is true.
const input = args && typeof args === 'object' ? args : {}
const topic = input.topic || (typeof args === 'string' ? args : null)
const priorAnswers = Array.isArray(input.answers) ? input.answers : []

if (!topic) {
  log('No topic provided. Pass args: { topic: "...", answers?: [...] }.')
  return { error: 'missing-topic' }
}

const answersBlock = priorAnswers.length
  ? `\n\nThe user has already answered these clarifying questions — fold them into the draft as settled decisions:\n${priorAnswers
      .map((a, i) => `${i + 1}. Q: ${a.question}\n   A: ${a.answer}`)
      .join('\n')}`
  : ''

const CRITIQUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ready', 'questions', 'gaps', 'missingScenarios'],
  properties: {
    ready: {
      type: 'boolean',
      description: 'true when the spec is complete enough to implement with no open questions',
    },
    questions: {
      type: 'array',
      description: 'ranked clarifying questions for the user; empty when ready=true',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'why', 'options'],
        properties: {
          question: { type: 'string' },
          why: { type: 'string', description: 'what decision this unblocks / why it matters' },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'plausible answers to offer the user (may be empty for free-form)',
          },
        },
      },
    },
    gaps: {
      type: 'array',
      items: { type: 'string' },
      description: 'requirements, edge cases, or constraints the draft omits',
    },
    missingScenarios: {
      type: 'array',
      items: { type: 'string' },
      description: 'Given/When/Then scenarios that SHOULD exist but are absent',
    },
  },
}

phase('Research')
const research = await agent(
  `Research context for authoring a rulebook task spec on: "${topic}".
Read-only. Gather:
1. Existing specs under .rulebook/specs/ and any related task specs in .rulebook/tasks/*/specs/ that overlap this topic.
2. The relevant source code, types, and conventions this spec will govern.
3. The required rulebook spec format (read .rulebook/specs/rulebook.md if present): ## ADDED/MODIFIED/REMOVED headers, "### Requirement: <name>" with SHALL/MUST, "#### Scenario:" with Given/When/Then.
Report a concise map: what already exists, what this spec must cover, conventions to follow, and obvious risks.`,
  { label: 'research', phase: 'Research', agentType: 'researcher', model: 'haiku' }
)

phase('Draft')
const draft = await agent(
  `Draft a complete rulebook task spec for: "${topic}".${answersBlock}

Ground every requirement in this codebase research:
"""
${research}
"""

Produce two artifacts as markdown:
1. proposal.md — a "## Why" section (≥20 chars, the motivation) and a "## What Changes" section.
2. spec.md — using "## ADDED Requirements" (and MODIFIED/REMOVED if relevant), each as
   "### Requirement: <Name>\\nThe system SHALL/MUST <...>" followed by one or more
   "#### Scenario: <Name>" blocks with Given / When / Then lines (4 hashtags for scenarios).

Be specific and testable. Do NOT invent requirements the topic/research/answers don't support — mark anything uncertain so the critic can turn it into a question. Do NOT write production code.`,
  { label: 'draft', phase: 'Draft', agentType: 'architect', model: 'opus' }
)

phase('Critique')
const critique = await agent(
  `You are an exacting spec reviewer. Adversarially critique this draft spec for "${topic}" — your job is to find what is missing, ambiguous, or unverifiable so it does not reach implementation half-baked.

Draft:
"""
${draft}
"""

Research context:
"""
${research}
"""
${answersBlock}

Identify:
- ranked clarifying QUESTIONS the user must answer (most decision-critical first); for each, say why it matters and offer plausible options.
- GAPS: requirements, constraints, error paths, or edge cases the draft omits.
- MISSING SCENARIOS: Given/When/Then cases that should exist but are absent.
Set ready=true ONLY if there are genuinely no open questions and the spec is implementation-ready.`,
  { label: 'critique', phase: 'Critique', agentType: 'architect', model: 'opus', schema: CRITIQUE_SCHEMA }
)

return {
  topic,
  draft,
  ready: !!(critique && critique.ready),
  questions: (critique && critique.questions) || [],
  gaps: (critique && critique.gaps) || [],
  missingScenarios: (critique && critique.missingScenarios) || [],
  answeredSoFar: priorAnswers.length,
}
