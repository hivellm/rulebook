## 1. Release
- [ ] 1.1 Verify all prior phases archived and quality gates passing
- [ ] 1.2 Run full eval harness, lock real lift numbers
- [ ] 1.3 Run `rulebook compress` on `templates/core/CLAUDE.md`, lock real ratio
- [ ] 1.4 Bump `package.json` `5.4.0-pre` → `5.4.0`
- [ ] 1.5 Finalize `CHANGELOG.md` entry with real numbers + release date
- [ ] 1.6 Update `README.md` feature list + MCP tool count
- [ ] 1.7 Build: `npm run build`
- [ ] 1.8 Publish: `npm publish`
- [ ] 1.9 Tag release: `git tag v5.4.0`

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
