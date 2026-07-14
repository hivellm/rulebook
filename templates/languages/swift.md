<!-- SWIFT:START -->
# Swift rules

## Non-negotiables

1. Swift 5.10+, `swift-tools-version: 5.10`; platforms iOS 17+/macOS 14+.
2. Strict concurrency: `.enableUpcomingFeature("StrictConcurrency")` (complete mode) in `swiftSettings`.
3. Build with warnings as errors: `swift build -Xswiftc -warnings-as-errors`.
4. `swiftlint lint --strict` and `swift-format lint --recursive Sources Tests` before commit — the *lint* mode locally, not `--in-place`, to match CI.
5. Thread-safe types marked `Sendable`; shared mutable state behind `actor`s, never locks-by-convention.
6. Native `throws` with custom `Error` enums; `LocalizedError` for user-facing errors.

## Conventions

- SwiftPM layout: `Sources/<Package>/`, `Tests/<Package>Tests/`; config in `.swiftlint.yml` and `.swift-format` at root.
- Public APIs documented with `///` DocC comments (`- Parameter`, `- Returns`, `- Throws`).
- async/await for all asynchrony; no completion-handler APIs in new code.
- Error enums with associated values (`case httpError(statusCode: Int)`); `Result` only for non-throwing contexts.
- SwiftLint opt-ins worth enabling: `empty_count`, `first_where`, `redundant_nil_coalescing`, `overridden_super_call`.
- Line length warning 120 / error 140.

## Testing

- XCTest in `Tests/`; async test methods (`func testX() async throws`).
- XCTest has no async `XCTAssertThrowsError` — use a do/catch helper extension.
- Coverage via `swift test --enable-code-coverage`.
- Performance baselines with `measure { }` blocks.

## Build & tooling

- Order per iteration: format lint → `swiftlint --strict` → `swift build -Xswiftc -warnings-as-errors` → `swift test --enable-code-coverage`.
- Docs: `swift package generate-documentation` (DocC).
- CI on macos-latest; local commands MUST match workflow commands exactly.
- Publishing = git semver tag (`1.0.0`, no `v` required) + Swift Package Index submission; consumers use `.package(url:, from:)`.
<!-- SWIFT:END -->
