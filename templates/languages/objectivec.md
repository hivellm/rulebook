<!-- OBJECTIVEC:START -->
# Objective-C rules

## Non-negotiables

- Xcode 15+, ARC mandatory — no MRC files, no `-fno-objc-arc` exceptions without a documented reason.
- Format gate: `clang-format --dry-run --Werror **/*.{h,m}` — `-i` (writes) locally vs `--dry-run` in CI is the classic mismatch; run dry-run before commit.
- `xcodebuild analyze -scheme YourScheme -sdk iphonesimulator` (clang static analyzer) must be clean before commit.
- CI builds unsigned: `CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO ONLY_ACTIVE_ARCH=NO` — do not let signing requirements leak into CI build commands.
- Treat warnings as errors in build settings; local commands MUST match `.github/workflows/*.yml` exactly.

## Conventions

- Modern Objective-C: `@property` with explicit attributes (`nonatomic, strong/weak/copy`), literals (`@[]`, `@{}`, `@1`), lightweight generics (`NSArray<NSNumber *> *`).
- Annotate nullability (`NS_ASSUME_NONNULL_BEGIN/END`, `nullable`) on all public headers — it defines the Swift interop surface.
- `copy` for `NSString`/block properties; `weak` for delegates to avoid retain cycles.
- Prefix classes (project 2–3 letter prefix); no category method name collisions — prefix category methods too.
- Designated initializers marked `NS_DESIGNATED_INITIALIZER`; return `instancetype`, not `id`.

## Testing

- XCTest; test classes subclass `XCTestCase`, fixtures in `setUp`/`tearDown`.
- Run via `xcodebuild test -scheme YourScheme -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15'` — pin the simulator destination or CI runners pick nonexistent devices.
- Assert error paths (`XCTAssertThrows`) as well as happy paths.

## Build & tooling

- `xcodebuild clean build` for verification; the static analyzer also runs inside normal Xcode builds.
- clang-format config committed as `.clang-format` at repo root.
- No standard dependency-audit CLI — rely on the analyzer plus manual review of CocoaPods/SPM dependencies.
<!-- OBJECTIVEC:END -->
