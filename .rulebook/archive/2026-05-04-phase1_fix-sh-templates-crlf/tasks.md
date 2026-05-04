## 1. Re-normalize templates
- [x] 1.1 Strip CR from `templates/hooks/terse-activate.sh`
- [x] 1.2 Strip CR from `templates/hooks/terse-mode-tracker.sh`
- [x] 1.3 Strip CR from `templates/hooks/resume-from-handoff.sh`
- [x] 1.4 Strip CR from `templates/hooks/on-compact-reinject.sh`
- [x] 1.5 Strip CR from `templates/hooks/check-context-and-handoff.sh`
- [x] 1.6 Strip CR from `templates/hooks/enforce-team-for-background-agents.sh`
- [x] 1.7 Strip CR from `templates/ralph/ralph-history.sh`
- [x] 1.8 Strip CR from `templates/ralph/ralph-init.sh`
- [x] 1.9 Strip CR from `templates/ralph/ralph-pause.sh`
- [x] 1.10 Strip CR from `templates/ralph/ralph-run.sh`
- [x] 1.11 Strip CR from `templates/ralph/ralph-status.sh`
- [x] 1.12 Strip CR from `templates/skills/workflows/ralph/install.sh`
- [x] 1.13 Verify with `file templates/**/*.sh` — no entry reports CRLF

## 2. Defensive normalization in init
- [x] 2.1 Add LF-normalization helper in `src/utils/file-system.ts` (`normalizeLineEndings` + `writeShellScript`)
- [x] 2.2 Apply at every `.sh` write site reached by `rulebook init` (`claude-settings-manager.ts`, `ralph-scripts.ts`, `git-hooks.ts`)
- [x] 2.3 Preserve `0o755` mode on hook scripts after normalization (POSIX only)

## 3. CI guard
- [x] 3.1 Add `scripts/check-sh-eol.mjs` that fails on `\r` in tracked `*.sh`/`*.bash`
- [x] 3.2 Wire into `.github/workflows/lint.yml` and add `npm run check:sh-eol`
- [x] 3.3 Confirmed: guard fails on a deliberately CRLF-poisoned `.sh` and passes on the clean tree

## 4. Tests
- [x] 4.1 Unit tests for `normalizeLineEndings` + `writeShellScript` in `tests/file-system.test.ts`
- [x] 4.2 `tests/claude-settings-manager.test.ts` — emitted `.sh` hooks contain zero `\r`
- [x] 4.3 `tests/ralph-scripts.test.ts` — emitted Ralph `.sh` scripts contain zero `\r`

## 5. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 5.1 Update or create documentation covering the implementation
- [x] 5.2 Write tests covering the new behavior
- [x] 5.3 Run tests and confirm they pass
