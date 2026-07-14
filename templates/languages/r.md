<!-- R:START -->
# R rules

## Non-negotiables

1. R 4.2+ (prefer 4.3+); tidyverse style guide enforced by `styler` + `lintr`.
2. `lintr::lint_package()` clean and `styler::style_pkg(dry = "on")` before tests.
3. `R CMD check --as-cran` passes with 0 ERRORs/WARNINGs/NOTEs before commit.
4. Never `library()` inside functions, never `attach()`, never `<<-` in packages.
5. `TRUE`/`FALSE`, never `T`/`F`; never modify global options or assume the working directory.
6. No leftover `browser()`/`print()` debug code.

## Conventions

- Explicit namespace `pkg::fn()` for all external functions; declare in DESCRIPTION `Imports:` with version floors (e.g. `dplyr (>= 1.1.0)`).
- roxygen2 with `Roxygen: list(markdown = TRUE)`; document every exported function with `@param`, `@return`, `@export`, `@examples`; NAMESPACE is generated — never edit by hand.
- Validate inputs at function entry with `stopifnot()` or explicit `stop()` messages.
- `.lintr` config in repo root (e.g. `line_length_linter(100)`).
- GitHub-only deps go in DESCRIPTION `Remotes:`; changelog lives in `NEWS.md`.
- Prefer vectorized operations over loops.

## Testing

- testthat 3.x (`Suggests: testthat (>= 3.0.0)`); files `tests/testthat/test-*.R`.
- Test error paths with `expect_error(fn(bad), "message")`, classes with `expect_s3_class`.
- Coverage via `covr::package_coverage()`, threshold ≥80%.
- Run with `devtools::test()`; full validation via `devtools::check()`.

## Build & tooling

- Iteration loop: `devtools::load_all()` → `devtools::test()` → `devtools::document()` → `devtools::check()`.
- Local commands MUST match CI exactly — `styler` with `dry = "on"` in both, `--as-cran` in both, or CI diverges.
- CI matrix: ubuntu/windows/macos × R release + devel.
- CRAN submission: `devtools::check(cran = TRUE)` with 0 NOTEs, then `devtools::submit_cran()`.
<!-- R:END -->
