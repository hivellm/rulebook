<!-- C:START -->
# C Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
clang-format --dry-run --Werror src/**/*.c  # Format check
make lint                 # Linting (if configured)
make test                 # All tests (100% pass)
make                      # Build verification

# Memory safety (recommended):
valgrind --leak-check=full ./build/test  # Memory leak check
```

## C Configuration

**CRITICAL**: Use C11 or C17 standard with strict warnings enabled.

- **Standard**: C11 or C17
- **Compiler**: GCC 11+ or Clang 14+
- **Build System**: CMake 3.20+ (recommended) or Make
- **Warnings**: Treat all warnings as errors
- **Sanitizers**: ASAN, UBSAN for memory safety

### CMakeLists.txt Requirements

```cmake
cmake_minimum_required(VERSION 3.20)
project(YourProject C)

set(CMAKE_C_STANDARD 17)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)

# Compiler warnings
if(MSVC)
  add_compile_options(/W4 /WX)
else()
  add_compile_options(-Wall -Wextra -Werror -pedantic)
endif()

# Enable sanitizers in Debug mode
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
  add_compile_options(-fsanitize=address,undefined)
  add_link_options(-fsanitize=address,undefined)
endif()

# Source files
add_executable(${PROJECT_NAME} src/main.c src/module.c)

# Include directories
target_include_directories(${PROJECT_NAME} PUBLIC include)

# Enable testing
enable_testing()
add_subdirectory(tests)
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow - use --dry-run, not -i!)
clang-format --dry-run --Werror src/**/*.c include/**/*.h tests/**/*.c

# 2. Static analysis (matches workflow)
clang-tidy src/**/*.c -- -std=c17 -Wall -Wextra -Werror

# 3. Build with warnings as errors (matches workflow)
cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_FLAGS="-Werror -Wall -Wextra -pedantic"
cmake --build build

# 4. Run all tests (MUST pass 100% - matches workflow)
ctest --test-dir build --output-on-failure --verbose

# 5. Check with Address Sanitizer (matches workflow)
cmake -B build-asan -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_C_FLAGS="-fsanitize=address,undefined -g"
cmake --build build-asan
ctest --test-dir build-asan --output-on-failure

# 6. Check with Valgrind (matches workflow)
valgrind --leak-check=full --error-exitcode=1 ./build/YourProject

# 7. Check coverage (matches workflow)
cmake -B build-cov -DCMAKE_BUILD_TYPE=Coverage \
  -DCMAKE_C_FLAGS="-fprofile-arcs -ftest-coverage"
cmake --build build-cov
ctest --test-dir build-cov
gcov build-cov/CMakeFiles/YourProject.dir/src/*.gcno
lcov --capture --directory build-cov --output-file coverage.info
lcov --list coverage.info

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- Running different commands locally than in CI causes "works on my machine" failures
- CI/CD failures happen when local checks differ from workflows
- Example: Using `clang-format -i` locally but `--dry-run --Werror` in CI = failure
- Example: Missing `-Werror` flag = warnings pass locally but fail in CI
- Example: Skipping sanitizers locally = CI catches memory bugs, use-after-free, buffer overflows
- Example: Not running Valgrind = memory leaks pass locally but fail in CI

### Formatting

- Use clang-format for consistent code style
- Configuration in `.clang-format`
- Check formatting in CI (don't auto-format)

Example `.clang-format`:
```yaml
Language: C
BasedOnStyle: LLVM
IndentWidth: 4
ColumnLimit: 100
AllowShortFunctionsOnASingleLine: Empty
BreakBeforeBraces: Attach
AlignConsecutiveMacros: true
```

### Static Analysis

- Use clang-tidy for static analysis
- Configuration in `.clang-tidy`
- Enable modernize and bugprone checks

Example `.clang-tidy`:
```yaml
Checks: >
  -*,
  bugprone-*,
  clang-analyzer-*,
  modernize-*,
  readability-*,
  performance-*,
  portability-*

CheckOptions:
  - key: readability-identifier-naming.FunctionCase
    value: lower_case
  - key: readability-identifier-naming.VariableCase
    value: lower_case
```

### Testing

- **Framework**: Unity, Check, or CTest
- **Location**: `/tests` directory
- **Coverage**: Must meet threshold (80%+)
- **Sanitizers**: ASAN, UBSAN, Valgrind
- **Memory Safety**: Zero memory leaks

Example Unity test:
```c
#include "unity.h"
#include "module.h"

void setUp(void) {
    // Setup before each test
}

void tearDown(void) {
    // Cleanup after each test
}

void test_function_should_return_expected_value(void) {
    int result = my_function(10);
    TEST_ASSERT_EQUAL_INT(20, result);
}

void test_function_should_handle_null_pointer(void) {
    TEST_ASSERT_NULL(my_function_with_null(NULL));
}

int main(void) {
    UNITY_BEGIN();
    RUN_TEST(test_function_should_return_expected_value);
    RUN_TEST(test_function_should_handle_null_pointer);
    return UNITY_END();
}
```

## Memory Safety

**CRITICAL**: Always check for memory issues.

### Required Checks

1. **Address Sanitizer (ASAN)**:
   ```bash
   gcc -fsanitize=address -g -o program main.c
   ./program
   ```

2. **Undefined Behavior Sanitizer (UBSAN)**:
   ```bash
   gcc -fsanitize=undefined -g -o program main.c
   ./program
   ```

3. **Valgrind**:
   ```bash
   valgrind --leak-check=full --show-leak-kinds=all ./program
   ```

4. **Static Analysis**:
   ```bash
   clang-tidy src/**/*.c
   cppcheck --enable=all --error-exitcode=1 src/
   ```

### Common Memory Issues to Prevent

```c
// ❌ BAD: Memory leak
char *buffer = malloc(100);
// ... use buffer ...
// Missing free()

// ✅ GOOD: Proper cleanup
char *buffer = malloc(100);
if (buffer == NULL) {
    return ERROR_NO_MEMORY;
}
// ... use buffer ...
free(buffer);
buffer = NULL;

// ❌ BAD: Use after free
char *ptr = malloc(10);
free(ptr);
strcpy(ptr, "test");  // UNDEFINED BEHAVIOR!

// ✅ GOOD: NULL after free
char *ptr = malloc(10);
free(ptr);
ptr = NULL;
if (ptr != NULL) {
    strcpy(ptr, "test");
}

// ❌ BAD: Buffer overflow
char buffer[10];
strcpy(buffer, "This is too long");  // BUFFER OVERFLOW!

// ✅ GOOD: Bounds checking
char buffer[10];
strncpy(buffer, "Safe", sizeof(buffer) - 1);
buffer[sizeof(buffer) - 1] = '\0';
```

## Best Practices

### DO's ✅

- **CHECK** return values from all functions
- **VALIDATE** all pointer arguments for NULL
- **FREE** all allocated memory
- **USE** const for immutable pointers
- **LIMIT** variable scope
- **ZERO** memory after free for security
- **BOUNDS** check all array accesses
- **SANITIZE** all inputs

### DON'Ts ❌

- **NEVER** ignore compiler warnings
- **NEVER** assume malloc succeeds
- **NEVER** use gets() (use fgets())
- **NEVER** use strcpy() (use strncpy() or strlcpy())
- **NEVER** use sprintf() (use snprintf())
- **NEVER** dereference NULL pointers
- **NEVER** return pointers to stack variables
- **NEVER** skip sanitizer checks

## Security Guidelines

1. **Input Validation**: Validate all external inputs
2. **Buffer Safety**: Always check bounds
3. **Integer Overflow**: Check arithmetic operations
4. **Format String**: Never use user input as format string
5. **Memory Zeroization**: Zero sensitive data after use

Example secure code:
```c
#include <string.h>
#include <stdlib.h>
#include <stdio.h>

// Secure string copy with bounds checking
int safe_strcpy(char *dest, size_t dest_size, const char *src) {
    if (dest == NULL || src == NULL || dest_size == 0) {
        return -1;
    }
    
    size_t src_len = strlen(src);
    if (src_len >= dest_size) {
        return -1;  // Not enough space
    }
    
    strncpy(dest, src, dest_size - 1);
    dest[dest_size - 1] = '\0';
    return 0;
}

// Secure memory cleanup
void secure_free(void **ptr, size_t size) {
    if (ptr == NULL || *ptr == NULL) {
        return;
    }
    
    // Zero memory before free
    memset(*ptr, 0, size);
    free(*ptr);
    *ptr = NULL;
}
```

<!-- C:END -->
