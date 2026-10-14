## 1. Implementation
- [x] 1.1 Operator decision Q3 recorded — Q3 = keep today's no-prompt behaviour via explicit allow rules (decided by the operator): `permissions.autoApprove` in rulebook.json, default true
- [x] 1.2 Deny rules generated (Bash, PowerShell, Edit paths); parity test against the script on the corpus — OS_SCHEDULING_DENY_RULES; gaps listed in tests/guard-payload-corpus.test.ts
- [x] 1.3 if-gated scaffolding guard — one handler per tool (`Edit(...)` does not fire for Write, verified on Claude Code 2.1.291); a passing call prints nothing
- [x] 1.4 Explicit allow rules per Q3, with consent prompt at update — Bash(*)/Edit(*)/Write(*), asked once by `rulebook update` (interactive), `--yes`/no TTY → true

## Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG entry + affected guides/specs) — README; CHANGELOG bullets handed to the release step
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass (type-check → lint → tests)
