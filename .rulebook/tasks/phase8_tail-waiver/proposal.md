# Proposal: phase8_tail-waiver

Source: GitHub issue #19 (external v7-perf audit)

## Why

The mandatory docs+tests tail hard-gates EVERY archive, forcing ceremony (or
dishonest checkboxes) on doc-only, refactor and tooling tasks. v7 principle:
enforce at the tool boundary, don't dictate workflow content.

## What Changes

- validateTask reports unchecked tail items as warnings, not errors.
- archiveTask accepts a one-line tailWaiver rationale, recorded in the
  archived task; all-or-nothing skipValidation stays for compat.
- rulebook_task {action:"archive"} gains tailWaiver param.
- update.ts stops retro-appending the tail to pre-existing tasks.
- Template wording: "check the items, or state in one line why they don't apply."

## Impact

- Affected specs: rulebook.md
- Affected code: task-manager.ts, v7-tools.ts, update.ts, templates, tests
- Breaking change: NO (gate loosens; default scaffold unchanged)
- User benefit: honest archives, zero fake tests
