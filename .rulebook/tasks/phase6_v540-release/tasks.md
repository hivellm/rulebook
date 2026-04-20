## 1. Release
- [x] 1.1 Verify all prior phases archived and quality gates passing
- [x] 1.2 Run full eval harness, lock real lift numbers
- [x] 1.3 Run `rulebook compress` on `templates/core/CLAUDE.md`, lock real ratio
- [x] 1.4 Bump `package.json` `5.4.0-pre` → `5.4.0`
- [x] 1.5 Finalize `CHANGELOG.md` entry with real numbers + release date
- [x] 1.6 Update `README.md` feature list + MCP tool count
- [x] 1.7 Build: `npm run build`
- [ ] 1.8 Publish: `npm publish`
- [ ] 1.9 Tag release: `git tag v5.4.0`

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [x] 2.1 Update or create documentation covering the implementation
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass

## Notes

Items 1.8 (`npm publish`) and 1.9 (`git tag v5.4.0`) are left unchecked
on purpose — they require the user's explicit authorization. These are
not reversible without a publish rollback + force-push (both forbidden
by `.claude/rules/git-safety.md`), so the AI assistant will NOT execute
them autonomously. User's go-ahead opens the final steps:

```bash
npm run build        # already done
npm publish          # when user authorizes
git tag v5.4.0 && git push origin v5.4.0
```

Archival-blocker status: `rulebook task archive` may refuse to close
this task while items 1.8 and 1.9 are unchecked. That's the correct
structural enforcement — a release isn't complete without publish +
tag. The user should either:
  - run publish + tag + re-check 1.8/1.9, then archive; OR
  - delete this task and accept that v5.4.0 ships without those.
