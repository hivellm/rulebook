# Post-compaction cheat sheet (Rust project)

Re-injected after every compaction. Keep ≤50 lines. Edit freely.

## Critical reminders

- Read `AGENTS.md` and `AGENTS.override.md` before changes.
- `cargo check` before `cargo test` — check is 5–10x faster.
- `cargo clippy -- -D warnings` must pass.
- `cargo fmt` before committing — no style debates.
- Edit files sequentially, not in parallel.
- Never revert uncommitted work; fix forward.
- If a fix fails twice, stop and escalate.

## Build & test quick reference

- **Check**: `cargo check --all-targets`
- **Build**: `cargo build`
- **Test**: `cargo test --all-features`
- **Lint**: `cargo clippy -- -D warnings`
- **Format**: `cargo fmt`
- **Run**: `cargo run`

## Forbidden

- No `unwrap()`/`expect()` in non-test code without a safety comment.
- No `unsafe` without a `// SAFETY:` comment.
- No new crates without authorization.
