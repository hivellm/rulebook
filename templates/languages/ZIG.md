<!-- ZIG:START -->
# Zig Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
zig fmt --check .         # Format check
zig build                 # Build verification
zig build test            # All tests (100% pass)

# No standard security audit tool for Zig yet
```

## Zig Configuration

**CRITICAL**: Use Zig 0.11+ with strict compilation and comprehensive testing.

- **Version**: Zig 0.11+
- **Recommended**: Zig 0.13+
- **Build System**: zig build (built-in)
- **Testing**: zig test (built-in)
- **Formatter**: zig fmt (built-in)

### build.zig Requirements

```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // Library
    const lib = b.addStaticLibrary(.{
        .name = "your-lib",
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });
    b.installArtifact(lib);

    // Executable
    const exe = b.addExecutable(.{
        .name = "your-app",
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });
    b.installArtifact(exe);

    // Tests
    const main_tests = b.addTest(.{
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });

    const run_main_tests = b.addRunArtifact(main_tests);
    const test_step = b.step("test", "Run library tests");
    test_step.dependOn(&run_main_tests.step);

    // Run command
    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);
}
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow)
zig fmt --check src/ tests/

# 2. Build (MUST pass - matches workflow)
zig build -Doptimize=ReleaseFast

# 3. Build with all optimizations (matches workflow)
zig build -Doptimize=ReleaseSmall
zig build -Doptimize=ReleaseSafe

# 4. Run all tests (MUST pass 100% - matches workflow)
zig build test

# 5. Test with different targets (matches workflow)
zig build test -Dtarget=x86_64-linux
zig build test -Dtarget=x86_64-windows
zig build test -Dtarget=aarch64-macos

# 6. Check for memory leaks (matches workflow)
zig build test -Doptimize=Debug --summary all

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- Running different commands locally than in CI causes build failures
- Zig's compile-time guarantees only work if all checks pass
- Example: Using `zig fmt src/` locally but `zig fmt --check src/` in CI = failure
- Example: Only testing Debug builds locally = Release builds fail in CI
- Example: Not testing cross-compilation = deployment fails on target platform

### Testing

- **Framework**: Built-in `zig test`
- **Location**: Tests can be inline or in `/tests`
- **Coverage**: Comprehensive test coverage required
- **Memory**: No leaks allowed (valgrind clean)

Example test structure:
```zig
const std = @import("std");
const testing = std.testing;
const DataProcessor = @import("processor.zig").DataProcessor;

test "DataProcessor: basic functionality" {
    var processor = DataProcessor.init(0.5);
    defer processor.deinit();
    
    const input = [_]i32{ 1, 2, 3, 4, 5 };
    const result = try processor.process(&input);
    defer testing.allocator.free(result);
    
    try testing.expect(result.len > 0);
    try testing.expectEqual(@as(usize, 3), result.len);
}

test "DataProcessor: handles empty input" {
    var processor = DataProcessor.init(0.5);
    defer processor.deinit();
    
    const input = [_]i32{};
    const result = try processor.process(&input);
    defer testing.allocator.free(result);
    
    try testing.expectEqual(@as(usize, 0), result.len);
}

test "DataProcessor: memory management" {
    // Test that all allocations are freed
    const allocator = testing.allocator;
    
    var processor = try DataProcessor.initWithAllocator(allocator, 0.5);
    defer processor.deinit();
    
    const input = try allocator.alloc(i32, 1000);
    defer allocator.free(input);
    
    for (input, 0..) |*item, i| {
        item.* = @intCast(i);
    }
    
    const result = try processor.process(input);
    defer allocator.free(result);
    
    // If we reach here without leaks, test passes
    try testing.expect(result.len > 0);
}
```

## Memory Safety

**CRITICAL**: Zig provides compile-time safety - use it!

```zig
// ✅ GOOD: Safe memory management
const std = @import("std");

pub fn processData(allocator: std.mem.Allocator, input: []const i32) ![]i32 {
    var result = std.ArrayList(i32).init(allocator);
    defer result.deinit();  // Always cleanup!
    
    for (input) |value| {
        if (value > 0) {
            try result.append(value * 2);
        }
    }
    
    return result.toOwnedSlice();
}

// Usage with proper cleanup
pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    
    const allocator = gpa.allocator();
    
    const input = [_]i32{ 1, 2, 3, 4, 5 };
    const result = try processData(allocator, &input);
    defer allocator.free(result);  // Free returned memory!
    
    for (result) |value| {
        std.debug.print("{}\n", .{value});
    }
}

// ❌ BAD: Memory leaks
pub fn processDataLeaky(allocator: std.mem.Allocator) ![]i32 {
    var result = std.ArrayList(i32).init(allocator);
    // Missing defer result.deinit()!
    
    try result.append(42);
    return result.toOwnedSlice();  // Leaks ArrayList memory!
}
```

## Best Practices

### DO's ✅

- **USE** defer for cleanup
- **CHECK** all error returns
- **VALIDATE** all inputs
- **TEST** with different allocators
- **USE** comptime for compile-time computations
- **PREFER** stack allocation when possible
- **USE** tagged unions for variants
- **CROSS-COMPILE** to verify portability

### DON'Ts ❌

- **NEVER** ignore error returns
- **NEVER** use undefined behavior
- **NEVER** leak memory
- **NEVER** use @ptrCast without validation
- **NEVER** assume platform specifics
- **NEVER** skip cross-compilation tests
- **NEVER** use global mutable state

## CI/CD Requirements

Must include GitHub Actions workflows:

1. **Testing** (`zig-test.yml`):
   - Test on Linux, Windows, macOS
   - Test with Debug, ReleaseSafe, ReleaseFast, ReleaseSmall
   - Cross-compilation tests
   - Memory leak detection

2. **Linting** (`zig-lint.yml`):
   - zig fmt --check
   - Build verification
   - All optimize modes

<!-- ZIG:END -->

