<!-- DART:START -->
# Dart rules

## Non-negotiables

- Dart 3.0+ (`sdk: '>=3.0.0 <4.0.0'`), sound null safety — no opt-outs, no `// @dart=2.x` pragmas.
- `dart analyze --fatal-infos --fatal-warnings` must pass; infos count as failures here, not just warnings.
- Format with `dart format --set-exit-if-changed .` — the exit-code flag is what CI runs; plain `dart format .` locally masks CI failures.
- Local commands MUST match `.github/workflows/*.yml` exactly (same flags, same line length).
- No `print()` in production code — use a logger.
- No `dynamic` and no bare `!` without a preceding null check; prefer null-aware operators (`?.`, `??`).

## Conventions

- `analysis_options.yaml` includes `package:lints/recommended.yaml` plus strict analyzer modes: `strict-casts`, `strict-inference`, `strict-raw-types`.
- Enable `unawaited_futures`; mark intentional fire-and-forget with `unawaited()`.
- `cancel_subscriptions` and `close_sinks` lints on — leaked streams are the classic Dart bug.
- Prefer `final` locals/fields and `const` constructors wherever possible.
- Always declare return types (`always_declare_return_types`); no relative `lib/` imports.
- Public APIs get `///` doc comments.

## Testing

- `package:test`; files live in `test/` and must end with `_test.dart`.
- Coverage via `dart test --coverage=coverage` + `coverage:format_coverage --lcov --report-on=lib`; threshold ≥80%.
- Group with `group()`/`setUp()`/`tearDown()`; every error path gets a `throwsA(isA<...>())` test.

## Build & tooling

- `dart pub add <pkg>` over hand-editing `pubspec.yaml`; run `dart pub outdated` as the dependency audit.
- Publish flow: bump version + CHANGELOG → full quality gate → `dart pub publish --dry-run` → `dart pub publish` → git tag.
- Never commit `.dart_tool/` or `build/`.
- CLI apps ship via `dart compile exe`; verify the artifact runs in CI.
<!-- DART:END -->
