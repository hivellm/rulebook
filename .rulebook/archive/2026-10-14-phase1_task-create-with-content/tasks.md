## 1. Implementation
- [x] 1.1 `TaskContent` type + renderers for proposal.md and tasks.md (standard format, items numbered, tail appended)
- [x] 1.2 `TaskManager.createTask(taskId, content)`: validate content, atomic write (temp dir → rename), no empty scaffold
- [x] 1.3 `TaskBackend` interface + GitHub backend take the same content
- [x] 1.4 MCP `rulebook_task create`: `why`, `what`, `items`, optional `impact`; clear error on missing fields; tool description updated
- [x] 1.5 CLI `rulebook task create`: `--why`, `--what`, repeatable `--item`, `--impact-*`, `--from <json>`; error with usage when missing
- [x] 1.6 Update every "create then fill" instruction: templates/core/rulebook.md, workspace.md, skills (rulebook, analysis, spec), workflows (rulebook-driver, spec-author), `.rulebook/specs/rulebook.md`, guard deny message, CLI help; mirror this repo's installed copies
- [x] 1.7 MCP schema-bytes budget moved deliberately with the measured value and a one-line rationale

## 2. Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (CHANGELOG 7.5.0 entry, specs, README task section)
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass (type-check → lint → tests)
