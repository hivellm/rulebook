# Tasks: F4 — Diagnostic-first directive

## 1. Template
- [ ] 1.1 Create `templates/rules/diagnostic-first.md` with the rule body and paper citation

## 2. Detection
- [ ] 2.1 Extend `src/core/detector.ts` to flag when a type-checker is present (tsc, mypy, cargo check, rustc, cmake, go vet, etc.)
- [ ] 2.2 `rules-generator.ts` (from F2) emits `diagnostic-first.md` when the flag is set

## 3. Tail (mandatory)
- [ ] 3.1 Update or create documentation covering the implementation
- [ ] 3.2 Write tests covering the new behavior (per-language detection, generation only when applicable)
- [ ] 3.3 Run tests and confirm they pass
