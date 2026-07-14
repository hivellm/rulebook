<!-- LISP:START -->
# Common Lisp rules

## Non-negotiables

- SBCL 2.3+ (or CCL) with ASDF3; Quicklisp for dependencies.
- Lint with `sblint your-system.asd` before tests.
- CI/scripted runs use `sbcl --non-interactive` — an interactive REPL drop hangs CI forever.
- Verify the system loads cleanly (`ql:quickload` with no warnings/errors) as a distinct gate before running tests.
- Tests run through ASDF: `(asdf:test-system :your-system)` — not by loading test files ad hoc.
- Local commands MUST match `.github/workflows/*.yml` exactly.

## Conventions

- One `.asd` per system; test system as a sub-system (`"your-system/tests"`) wired via `:in-order-to ((test-op (test-op "your-system/tests")))` and `:perform (test-op ... (symbol-call :fiveam :run! ...))`.
- `src/package.lisp` defines packages first; every component declares `:depends-on` explicitly — ASDF does not infer load order from `in-package`.
- Prefer established utility libraries (`alexandria`, `cl-ppcre`, `str`) over reinventing.
- Signal conditions (`error`, custom condition classes) for failures; don't return sentinel values.
- Keep `defsystem` metadata complete: `:description`, `:version`, `:author`, `:license`.

## Testing

- FiveAM (or Prove): `def-suite` + `in-suite`, `test` forms with `is` / `is-true` / `signals`.
- Every error path gets a `(signals error-type ...)` assertion.
- Test package mirrors the main package (`:your-system/tests`).

## Build & tooling

- Build via `(asdf:make :your-system)`; never rely on stale FASLs — a clean load in a fresh image is the truth.
- Dependency resolution through Quicklisp (`ql:quickload`); pin with a qlfile/CLPM if reproducibility matters.
- Do not commit `*.fasl` or Quicklisp caches.
<!-- LISP:END -->
