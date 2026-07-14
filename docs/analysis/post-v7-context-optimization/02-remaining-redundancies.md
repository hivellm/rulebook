# 02 — Remaining redundancies (the real optimization surface)

**F-004 — 12 slash commands duplicate the 5 consolidated MCP tools.**
Evidence: `templates/commands/rulebook-{task-create,task-list,task-show,
task-archive,task-apply,task-validate,knowledge-add,knowledge-list,
learn-capture,learn-list,decision-create,decision-list}.md`. Each body ends
with an explicit `**MCP equivalent**: rulebook_task` (or `_memory`). Phase 3
collapsed the *MCP* surface 26→5 but left the *command* surface at the old
12-verb granularity.

Cost:
- **426 tokens** of command frontmatter injected as slash-command
  descriptions (tiktoken over the 12 templates),
- **12 of the 29 installed files**,
- 2,616 tokens of on-disk body (not context-loaded, but churn).

Confidence: high. Impact: medium — this single item causes both the
file-count failure and a big slice of the token overage.

**F-005 — CLAUDE.md and AGENTS.md restate the same 7 rules.**
Evidence, side-by-side:

| CLAUDE.md section | AGENTS.md rule |
|---|---|
| Commands / quality gate | rule 1 |
| Values #1 (complete implementations) | rule 2 |
| Git safety block | rule 3 |
| Values #2 (root causes) | rule 5 |
| Values #3 (surgical diffs) | rule 6 |
| Rulebook / tasks section | rule 7 |
| Orchestration section | rule 9 |

AGENTS.md (634 tok) is ~95% a paraphrase of CLAUDE.md (545 tok). This is the
duplication class the v7 analysis flagged (its F-008) but did not fully
resolve — it moved rule duplication out of `.claude/rules/` but left it
standing *between* the two root memory files. Confidence: high. Impact:
medium (attention dilution + double token cost where both are loaded).

**F-006 — `typescript` guidance is stored twice on disk.**
Evidence: `.claude/rules/typescript.md` (2,137 B, path-scoped) and
`.rulebook/specs/typescript.md` (1,980 B, `TYPESCRIPT:START/END`) carry the
same five non-negotiables + conventions. AGENTS.md's "Language & Framework
Rules" points to the **spec** copy, while the rule copy claims to be the
Claude-Code-loaded copy. Two files, one payload, both shipped. Confidence:
high. Impact: low-medium (redundant file + drift risk between the two copies).

**F-007 — MCP schema is at its byte ceiling (3,592 / 3,600 B).**
Evidence: `src/mcp/tools/v7-tools.ts` tool descriptions plus per-field
`.describe()` strings. Trimming could recover ~60–120 tokens but risks
tool-selection accuracy. Confidence: medium. Impact: low — **not worth
doing** unless a 6th tool is ever added (which would breach the byte budget).

**F-008 — MCP tool descriptions already cover everything the commands say.**
Evidence: `rulebook_task`'s description enumerates the same verbs the 12
commands cover. If F-004 removes the commands, the MCP schema becomes the
single source of truth — confirming the commands add no information the model
doesn't already get. Confidence: high. Impact: reinforces F-004.
