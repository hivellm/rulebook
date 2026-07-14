<!-- JULIA:START -->
# Julia rules

## Non-negotiables

- Julia 1.9+; declare the floor in `Project.toml` `[compat]` (`julia = "1.9"`) — packages without compat bounds are unregistrable.
- Always run with the project environment: `julia --project=.`; never install into the global env.
- Format check via JuliaFormatter: `julia -e 'using JuliaFormatter; format(".", overwrite=false)'` — `overwrite=false` is the CI check mode; formatting locally with `overwrite=true` and checking in CI must both pass.
- Tests run through the package manager: `julia --project=. -e 'using Pkg; Pkg.test()'` — not by including test files manually.
- Local commands MUST match `.github/workflows/*.yml` exactly.

## Conventions

- `Project.toml` carries name, UUID, version, `[deps]`, `[compat]`; test-only deps go in `[extras]` + `[targets] test = [...]` (or a `test/Project.toml`).
- Every `[deps]` entry gets a `[compat]` bound, not just `julia`.
- Package layout: `src/YourPackage.jl` as the single entry module; `test/runtests.jl` as the test entry.
- Errors via typed exceptions (`ArgumentError`, `DomainError`, custom `Exception` subtypes); test them with `@test_throws`.
- Avoid type-unstable code in hot paths; check with `@code_warntype` when performance matters.
- Docs with Documenter.jl; docstrings on all exported names.

## Testing

- `Test` stdlib: nested `@testset` blocks, `@test` / `@test_throws`.
- Coverage: rerun tests with `--code-coverage=user`.
- Keep `test/runtests.jl` as the only entry point; split large suites into included files.

## Build & tooling

- Dependency updates via `Pkg.update()`; commit `Manifest.toml` for applications, omit it for libraries.
- Lint with the configured linter (Lint.jl per this template) before tests.
- Registration/release: bump `version` in `Project.toml`, then register (JuliaRegistrator) — never re-tag an existing version.
<!-- JULIA:END -->
