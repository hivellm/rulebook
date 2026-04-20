## 1. Implementation
- [ ] 1.1 Create `src/skills/compress/validator.ts` with invariants (headings, code fences, URLs, paths, commands, dates, versions)
- [ ] 1.2 Create `src/skills/compress/compressor.ts` with prose rewriter + 2-retry budget
- [ ] 1.3 Create `src/skills/compress/cli.ts` with 4 subcommands (compress, --dry-run, --restore, --check)
- [ ] 1.4 Wire backup-to-`.original.md` + atomic rewrite
- [ ] 1.5 Register `rulebook compress` subcommand in `src/cli/commands/`
- [ ] 1.6 Dogfood: compress `templates/core/CLAUDE.md`, verify round-trip validators pass

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
