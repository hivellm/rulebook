# Proposal: phase2_remove-multi-tool-generator (revised — hybrid)

## Why

Original audit was wrong. `core/ide/multi-tool-generator.ts` is NOT an
MCP-tool stub generator — it's the wiring that propagates `AGENTS.md`
rules to four real IDE config files when the corresponding IDE is
detected:

- `GEMINI.md` — Gemini CLI
- `.continue/rules/` — Continue.dev
- `.windsurfrules` — Windsurf
- `.github/copilot-instructions.md` — GitHub Copilot

It has 50+ tests in `multi-tool-detection.test.ts` and is end-to-end
wired through `core/detect/detector.ts` → `core/generators/generator.ts`.
Removing it would silently break IDE rule propagation for every project
that uses Gemini / Continue.dev / Windsurf / Copilot.

## What Changes (revised)

Hybrid: keep the working integrations, prune only orphan IDE templates
that have zero callers in `src/`.

**Kept**:
- `src/core/ide/multi-tool-generator.ts` (active feature)
- `templates/ides/GEMINI_RULES.md`
- `templates/ides/CONTINUE_RULES.md`
- `templates/ides/WINDSURF_RULES.md`
- `templates/ides/COPILOT_INSTRUCTIONS.md`
- `tests/multi-tool-detection.test.ts`

**Removed** (orphan reference templates with zero call sites):
- `templates/ides/JETBRAINS_AI.md`
- `templates/ides/REPLIT.md`
- `templates/ides/TABNINE.md`
- `templates/ides/ZED.md`
- `templates/ides/VSCODE.md`
- `templates/ides/CURSOR.md`
- `templates/ides/COPILOT.md`
- `templates/ides/WINDSURF.md`

## Impact

- Affected specs: none.
- Affected code: `templates/ides/` only — 8 unused .md files deleted.
- Breaking change: NO. None of the deleted templates were referenced
  by any code path.
- User benefit: smaller install footprint; surface area reflects what's
  actually wired.
