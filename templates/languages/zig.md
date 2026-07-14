<!-- ZIG:START -->
# Zig rules

## Non-negotiables

1. Zig 0.11+ (prefer 0.13+); built-in tooling only: `zig build`, `zig test`, `zig fmt`.
2. `zig fmt --check .` before commit — the check variant locally, since CI uses it; plain `zig fmt` silently diverges.
3. Never ignore error returns; every `try`/`catch` path handled — no `catch unreachable` outside proven invariants.
4. No memory leaks: `defer` cleanup at allocation site; tests use `std.testing.allocator` (leak-detecting) so leaks fail the test.
5. Build and test all optimize modes: Debug, ReleaseSafe, ReleaseFast, ReleaseSmall — Debug-only local testing lets Release builds break in CI.
6. No `@ptrCast` without validation; no global mutable state; no reliance on platform specifics without cross-compile verification.

## Conventions

- Functions that allocate take `allocator: std.mem.Allocator` as first parameter; return owned slices via `toOwnedSlice()`, caller frees.
- `defer x.deinit()` / `defer allocator.free(x)` immediately after acquisition.
- `comptime` for compile-time computation; tagged unions for variants; prefer stack allocation.
- `build.zig` uses `b.standardTargetOptions(.{})` + `b.standardOptimizeOption(.{})` and exposes `test`/`run` steps.
- Applications: `std.heap.GeneralPurposeAllocator` with `defer _ = gpa.deinit()` to catch leaks at exit.

## Testing

- Inline `test "name" { }` blocks (or `tests/`); run via `zig build test`.
- `std.testing.expectEqual` needs cast on the expected literal: `try testing.expectEqual(@as(usize, 3), result.len);`.
- Cross-target test matrix: `zig build test -Dtarget=x86_64-linux|x86_64-windows|aarch64-macos`.
- Free returned slices in tests (`defer testing.allocator.free(result)`) or the allocator reports a leak.

## Build & tooling

- Order per iteration: `zig fmt --check` → `zig build` (all optimize modes) → `zig build test`.
- CI on Linux/Windows/macOS with all four optimize modes + cross-compilation.
- No standard security-audit tool exists for Zig yet — review vendored deps manually.
<!-- ZIG:END -->
