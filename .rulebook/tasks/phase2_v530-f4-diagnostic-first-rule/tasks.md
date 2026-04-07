# Tasks: F4 — Diagnostic-first directive

## 1. Template
- [x] 1.1 Created `templates/rules/diagnostic-first.md` with check-before-test rule, quantitative justification (paper §5–6: 8.8% → 25.3% adoption), and language table (TS, Rust, Python, Go, C/C++, Java, C#, TML)

## 2. Detection
- [x] 2.1 Added to `ALWAYS_ON_RULES` in `src/core/rules-generator.ts` — emitted for all projects regardless of language (the table inside the rule covers multiple languages; the check command varies per stack)
- [x] 2.2 No conditional detection needed — the rule is always useful and carries no paths: frontmatter (applies globally)

## 3. Tail (mandatory)
- [x] 3.1 Documentation: rule file is self-documenting with evidence citations
- [x] 3.2 Tests: covered by rules-generator.test.ts (ALWAYS_ON_RULES emission)
- [x] 3.3 Full suite passing, lint clean, type-check clean
