## 1. Implementation
- [ ] 1.1 Create `src/hooks/safe-flag-io.ts` with VALID_MODES + MAX_FLAG_BYTES constants
- [ ] 1.2 Implement `safeWriteFlag` — lstat target + parent, O_NOFOLLOW, atomic temp+rename, 0600
- [ ] 1.3 Implement `readFlag` — lstat target, size cap, O_NOFOLLOW, whitelist validation
- [ ] 1.4 Audit existing hooks for predictable-path writes
- [ ] 1.5 Retrofit handoff `_pending.md` write through safeWriteFlag
- [ ] 1.6 Retrofit telemetry file writes where semantically equivalent

## 2. Tail (mandatory — enforced by rulebook v5.3.0)
- [ ] 2.1 Update or create documentation covering the implementation
- [ ] 2.2 Write tests covering the new behavior
- [ ] 2.3 Run tests and confirm they pass
