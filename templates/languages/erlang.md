<!-- ERLANG:START -->
# Erlang rules

## Non-negotiables

- Erlang/OTP 26+ (27 preferred), rebar3 as the only build tool.
- `erl_opts` include `warnings_as_errors, warn_export_all, warn_unused_import, warn_untyped_record`.
- `rebar3 dialyzer` must be clean before commit — warnings `error_handling, underspecs, unmatched_returns` enabled; never deploy with Dialyzer findings.
- `rebar3 xref` must pass (`undefined_function_calls, locals_not_used, deprecated_function_calls`); skipping xref ships undefined calls to production.
- Full local gate mirrors CI: `fmt --check` → `lint` (Elvis) → `compile` → `dialyzer` → `eunit` → `ct` → `proper` → `cover` → `xref`.
- No unsupervised processes — every process lives under a supervisor tree.

## Conventions

- OTP behaviours (`gen_server`, `gen_statem`, `supervisor`) over raw `spawn`/`receive` loops.
- `-spec` on all exported functions; `-record` fields typed (`warn_untyped_record` enforces it).
- Tagged returns `{ok, Value} | {error, Reason}`; no catch-all clauses without logging.
- Test profile relaxes `export_all` (`{erl_opts, [debug_info, export_all, nowarn_export_all]}`); prod profile strips debug info and builds relx releases with `include_erts`.
- Plugins: `rebar3_hex`, `rebar3_ex_doc`, `rebar3_proper`, `rebar3_lint`.
- EDoc for module/function documentation.

## Testing

- Three layers: EUnit (`*_tests.erl`, `?assert*` macros) for units, Common Test (`*_SUITE.erl`) for integration, PropEr (`prop_*.erl`, `?FORALL`) for properties.
- `{cover_enabled, true}` in rebar.config; run `rebar3 cover` against the threshold.
- CT suites start/stop the app in `init_per_suite`/`end_per_suite`, never in test cases.

## Build & tooling

- Dialyzer PLT: `plt_apps: top_level_deps`, local PLT, global base PLT (`erts, kernel, stdlib`) — cache it in CI or every run rebuilds for minutes.
- Dependency inspection via `rebar3 tree`; pin dep versions exactly in `rebar.config`.
- Publish with `rebar3 hex publish` after bumping `src/*.app.src` version and passing the full gate.
- CI matrix: OTP 26 and 27; release job must verify all applications start.
<!-- ERLANG:END -->
