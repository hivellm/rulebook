# Proposal: phase5_codex-block-not-in-claude

## Why
The RULEBOOK-CODEX block at the top of AGENTS.override.md is also injected into every Claude Code session through @AGENTS.override.md, about 290 tokens per session; it is almost all of the 7.4 to 7.5 always-on growth (1,160 to 1,449).

## What Changes
Keep the Codex rules block visible to Codex but not to Claude Code (for example a file Codex reads that CLAUDE.md does not import, or a form Claude Code strips), verified with codex debug prompt-input and a Claude Code session.

## Impact
- Affected specs: none
- Affected code: src/core/state/override-manager.ts, src/core/generators/*
- Breaking change: NO
- User benefit: ~290 fewer tokens per Claude Code session in projects with an override
