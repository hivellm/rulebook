<!-- ELIXIR:START -->
# Elixir rules

## Non-negotiables

- Elixir 1.16+ on OTP 26+; compile with `mix compile --warnings-as-errors`.
- `mix format --check-formatted` is the gate — plain `mix format` locally while CI checks formatting = guaranteed CI failure.
- `mix credo --strict` must pass with zero issues.
- Dialyzer (`mix dialyzer` via dialyxir) must pass; cache the PLT at `priv/plts/dialyzer.plt` and enable `:error_handling, :underspecs` flags.
- Coverage ≥95% via ExCoveralls (`mix coveralls`).
- Local commands MUST match `.github/workflows/*.yml` exactly (same flags).

## Conventions

- `@spec` on every public function; `@type` for custom types; tagged tuples `{:ok, value} | {:error, reason}` for fallible functions.
- `with` chains for multi-step fallible flows; raise only for genuinely exceptional/programmer errors.
- `@moduledoc`/`@doc` with doctest examples (`iex>` blocks) on public modules — doctests double as tests.
- OTP structure: supervised processes only (`Supervisor` + `GenServer`/`Task.Supervisor`); no unlinked spawns.
- Dev-only deps (`credo`, `dialyxir`, `ex_doc`) with `only: [:dev, :test], runtime: false`.
- Env config split across `config/{config,dev,test,prod}.exs`.

## Testing

- ExUnit, `test/` mirrors `lib/`; use `use ExUnit.Case, async: true` unless the test touches shared state.
- Add `doctest MyModule` in each test module so doc examples are verified.
- `mix test --cover` for CI; group tests with `describe "fun_name/arity"` blocks.

## Build & tooling

- Security/dependency audit: `mix hex.audit` + `mix hex.outdated`.
- Publishing: bump `mix.exs` version + CHANGELOG → full gate → `mix hex.build` to verify → `mix hex.publish`; HexDocs regenerates automatically.
- `.formatter.exs` defines inputs and line length — never override formatter output by hand.
- CI matrix: Elixir 1.16/1.17 x OTP 26/27.
<!-- ELIXIR:END -->
