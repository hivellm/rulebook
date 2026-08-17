## 1. Implementation

- [ ] 1.1 Add `gitPushMode` to the persisted config type and write it in `.rulebook/rulebook.json` at init
- [ ] 1.2 `update`: read the persisted value; when absent, recover the mode by parsing the existing `.rulebook/specs/git.md` header instead of falling back to `'manual'`
- [ ] 1.3 Keep `'manual'` as the default only when there is no prior git spec (genuinely new project)
- [ ] 1.4 Verify on this repo: `.rulebook/specs/git.md` stays AUTO across a full `rulebook update`

## 2. Tail (docs + tests — check or waive with tailWaiver)

- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior — update preserves AUTO with and without the persisted key; new project still defaults to manual
- [ ] 2.3 Run tests and confirm they pass
