<!-- CPP:START -->
# C/C++ Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
clang-format --dry-run --Werror src/**/*.cpp  # Format check
clang-tidy src/**/*.cpp   # Linting
make test                 # All tests (100% pass)
make                      # Build verification

# Additional checks:
cppcheck --enable=all src/  # Static analysis
valgrind --leak-check=full ./build/test  # Memory check
```

## C/C++ Configuration

**CRITICAL**: Use C++20 or C++23 with modern CMake.

- **C++ Standard**: C++20 or C++23
- **CMake**: 3.25+
- **Compiler**: GCC 11+, Clang 15+, or MSVC 19.30+
- **Build System**: CMake (recommended) or Meson
- **Package Manager**: Conan or vcpkg

### CMakeLists.txt Requirements

```cmake
cmake_minimum_required(VERSION 3.25)
project(YourProject VERSION 1.0.0 LANGUAGES CXX)

# C++ Standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler warnings
if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(-Wall -Wextra -Wpedantic -Werror)
endif()

# Export compile commands for tooling
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Project options
option(BUILD_TESTING "Build tests" ON)
option(BUILD_DOCS "Build documentation" ON)
option(ENABLE_SANITIZERS "Enable sanitizers" ON)

# Dependencies (using FetchContent or find_package)
include(FetchContent)

FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG v1.14.0
)
FetchContent_MakeAvailable(googletest)

# Library
add_library(${PROJECT_NAME}
    src/your_module.cpp
    src/your_module.hpp
)

target_include_directories(${PROJECT_NAME}
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Enable sanitizers in debug
if(ENABLE_SANITIZERS AND CMAKE_BUILD_TYPE MATCHES Debug)
    target_compile_options(${PROJECT_NAME} PRIVATE
        -fsanitize=address
        -fsanitize=undefined
        -fno-omit-frame-pointer
    )
    target_link_options(${PROJECT_NAME} PRIVATE
        -fsanitize=address
        -fsanitize=undefined
    )
endif()

# Tests
if(BUILD_TESTING)
    enable_testing()
    add_subdirectory(tests)
endif()

# Installation
install(TARGETS ${PROJECT_NAME}
    EXPORT ${PROJECT_NAME}Targets
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
    INCLUDES DESTINATION include
)
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow - use --dry-run, not -i!)
clang-format --dry-run --Werror src/**/*.{cpp,hpp} tests/**/*.{cpp,hpp}

# 2. Static analysis (matches workflow)
clang-tidy src/**/*.cpp -- -std=c++20

# 3. Build (MUST pass with no warnings - matches workflow)
cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_FLAGS="-Werror"
cmake --build build

# 4. Run all tests (MUST pass 100% - matches workflow)
ctest --test-dir build --output-on-failure

# 5. Check with sanitizers (matches workflow)
cmake -B build-asan -DENABLE_SANITIZERS=ON
cmake --build build-asan
ctest --test-dir build-asan

# 6. Check coverage (matches workflow)
cmake -B build-cov -DCMAKE_BUILD_TYPE=Coverage
cmake --build build-cov
ctest --test-dir build-cov
gcov build-cov/CMakeFiles/YourProject.dir/src/*.gcno

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**Why This Matters:**
- CI/CD failures happen when local commands differ from workflows
- Example: Using `clang-format -i` locally but `--dry-run --Werror` in CI = failure
- Example: Missing `-Werror` flag = warnings pass locally but fail in CI
- Example: Skipping sanitizers locally = CI catches memory bugs you missed
```

**If ANY of these fail, you MUST fix the issues before committing.**

### Code Style

Use `.clang-format` for consistent formatting:

```yaml
---
Language: Cpp
BasedOnStyle: Google
IndentWidth: 4
ColumnLimit: 100
UseTab: Never
PointerAlignment: Left
ReferenceAlignment: Left
DerivePointerAlignment: false

# Includes
SortIncludes: CaseInsensitive
IncludeBlocks: Regroup
IncludeCategories:
  - Regex: '^<.*\.h>'
    Priority: 1
  - Regex: '^<.*>'
    Priority: 2
  - Regex: '.*'
    Priority: 3

# Braces
BreakBeforeBraces: Attach
AllowShortFunctionsOnASingleLine: Inline
AllowShortIfStatementsOnASingleLine: Never

# Spacing
SpaceAfterCStyleCast: false
SpaceAfterTemplateKeyword: true
SpaceBeforeParens: ControlStatements

# Modern C++
Standard: c++20
```

### Static Analysis

Use `.clang-tidy` for code analysis:

```yaml
---
Checks: >
  *,
  -abseil-*,
  -altera-*,
  -android-*,
  -fuchsia-*,
  -google-*,
  -llvm-*,
  -llvmlibc-*,
  -zircon-*,
  -readability-identifier-length,
  -modernize-use-trailing-return-type

CheckOptions:
  - key: readability-identifier-naming.NamespaceCase
    value: lower_case
  - key: readability-identifier-naming.ClassCase
    value: CamelCase
  - key: readability-identifier-naming.StructCase
    value: CamelCase
  - key: readability-identifier-naming.FunctionCase
    value: camelCase
  - key: readability-identifier-naming.VariableCase
    value: lower_case
  - key: readability-identifier-naming.ConstantCase
    value: UPPER_CASE
  - key: readability-identifier-naming.MemberCase
    value: lower_case_
  - key: readability-identifier-naming.PrivateMemberSuffix
    value: '_'

WarningsAsErrors: '*'
```

### Testing

- **Framework**: Google Test (recommended) or Catch2
- **Location**: `tests/` directory
- **Coverage**: gcov/lcov or llvm-cov
- **Coverage Threshold**: 95%+

Example test with Google Test:

```cpp
#include <gtest/gtest.h>
#include "your_module.hpp"

namespace your_namespace::tests {

class DataProcessorTest : public ::testing::Test {
protected:
    void SetUp() override {
        processor = std::make_unique<DataProcessor>();
    }

    void TearDown() override {
        processor.reset();
    }

    std::unique_ptr<DataProcessor> processor;
};

TEST_F(DataProcessorTest, ProcessValidInput) {
    const std::string input = "hello";
    const auto result = processor->process(input);
    
    EXPECT_EQ(result, "HELLO");
}

TEST_F(DataProcessorTest, ProcessEmptyInputThrows) {
    EXPECT_THROW(
        processor->process(""),
        std::invalid_argument
    );
}

TEST_F(DataProcessorTest, ProcessLargeInput) {
    const std::string input(1000, 'a');
    const auto result = processor->process(input);
    
    ASSERT_EQ(result.size(), 1000);
    EXPECT_TRUE(std::all_of(result.begin(), result.end(), 
        [](char c) { return std::isupper(c); }));
}

} // namespace your_namespace::tests
```

### Modern C++ Best Practices

- Use RAII for resource management
- Prefer `std::unique_ptr` and `std::shared_ptr` over raw pointers
- Use `const` and `constexpr` liberally
- Prefer `std::string_view` for read-only strings
- Use range-based for loops
- Use `auto` for type deduction when clear
- Avoid manual memory management

Example modern C++ code:

```cpp
#pragma once

#include <memory>
#include <string>
#include <string_view>
#include <vector>
#include <optional>
#include <expected>

namespace your_namespace {

/// @brief Processes data with various transformations
class DataProcessor {
public:
    DataProcessor() = default;
    ~DataProcessor() = default;
    
    // Delete copy constructor and assignment
    DataProcessor(const DataProcessor&) = delete;
    DataProcessor& operator=(const DataProcessor&) = delete;
    
    // Default move constructor and assignment
    DataProcessor(DataProcessor&&) noexcept = default;
    DataProcessor& operator=(DataProcessor&&) noexcept = default;
    
    /// @brief Process input string to uppercase
    /// @param input The input string to process
    /// @return Processed string or error
    /// @throws std::invalid_argument if input is empty
    [[nodiscard]] std::string process(std::string_view input) const;
    
    /// @brief Find value in data
    /// @param data The data to search
    /// @param key The key to find
    /// @return Optional value if found
    [[nodiscard]] std::optional<std::string> findValue(
        const std::vector<std::pair<std::string, std::string>>& data,
        std::string_view key
    ) const;
    
    /// @brief Process multiple items
    /// @param items Items to process
    /// @return Processed items
    [[nodiscard]] std::vector<std::string> processMany(
        const std::vector<std::string>& items
    ) const;

private:
    mutable std::mutex mutex_;
};

} // namespace your_namespace
```

Implementation:

```cpp
#include "your_module.hpp"
#include <algorithm>
#include <stdexcept>
#include <cctype>

namespace your_namespace {

std::string DataProcessor::process(std::string_view input) const {
    if (input.empty()) {
        throw std::invalid_argument("Input cannot be empty");
    }
    
    std::string result;
    result.reserve(input.size());
    
    std::transform(input.begin(), input.end(), 
                   std::back_inserter(result),
                   [](unsigned char c) { return std::toupper(c); });
    
    return result;
}

std::optional<std::string> DataProcessor::findValue(
    const std::vector<std::pair<std::string, std::string>>& data,
    std::string_view key
) const {
    auto it = std::find_if(data.begin(), data.end(),
        [key](const auto& pair) { return pair.first == key; });
    
    if (it != data.end()) {
        return it->second;
    }
    
    return std::nullopt;
}

std::vector<std::string> DataProcessor::processMany(
    const std::vector<std::string>& items
) const {
    std::vector<std::string> results;
    results.reserve(items.size());
    
    std::transform(items.begin(), items.end(),
                   std::back_inserter(results),
                   [this](const auto& item) { return process(item); });
    
    return results;
}

} // namespace your_namespace
```

## Documentation

Use Doxygen for API documentation:

```cpp
/**
 * @file your_module.hpp
 * @brief Data processing utilities
 * @author Your Name
 * @date 2024-10-23
 */

/**
 * @class DataProcessor
 * @brief Processes various data formats
 * 
 * This class provides thread-safe data processing capabilities.
 * All methods are const-correct and exception-safe.
 * 
 * @example
 * @code{.cpp}
 * DataProcessor processor;
 * auto result = processor.process("hello");
 * assert(result == "HELLO");
 * @endcode
 */
```

### Doxyfile Configuration:

```
PROJECT_NAME = "Your Project"
PROJECT_NUMBER = 1.0.0
OUTPUT_DIRECTORY = docs
GENERATE_HTML = YES
GENERATE_LATEX = NO
EXTRACT_ALL = YES
EXTRACT_PRIVATE = NO
EXTRACT_STATIC = YES
SOURCE_BROWSER = YES
INLINE_SOURCES = YES
RECURSIVE = YES
```

## Project Structure

```
project/
├── CMakeLists.txt          # CMake configuration
├── .clang-format           # Code formatting rules
├── .clang-tidy             # Static analysis rules
├── Doxyfile                # Documentation config
├── conanfile.txt           # Conan dependencies (optional)
├── vcpkg.json              # vcpkg dependencies (optional)
├── README.md               # Project overview
├── CHANGELOG.md            # Version history
├── LICENSE                 # Project license
├── include/
│   └── your_project/
│       └── your_module.hpp # Public headers
├── src/
│   └── your_module.cpp     # Implementation
├── tests/
│   ├── CMakeLists.txt
│   └── test_your_module.cpp
├── benchmarks/             # Performance benchmarks
│   └── benchmark_main.cpp
└── docs/                   # Project documentation
```

## Memory Safety

- Use RAII for all resource management
- Prefer stack allocation over heap
- Use smart pointers for heap allocation
- Never use raw `new`/`delete`
- Use containers instead of manual arrays
- Check all pointer dereferences

Example:

```cpp
// Good: RAII with smart pointers
class FileManager {
public:
    explicit FileManager(std::string_view filename) 
        : file_(std::make_unique<std::ifstream>(filename.data())) {
        if (!file_->is_open()) {
            throw std::runtime_error("Failed to open file");
        }
    }
    
    // RAII - file automatically closed
    ~FileManager() = default;
    
    [[nodiscard]] std::string readLine() {
        std::string line;
        if (std::getline(*file_, line)) {
            return line;
        }
        throw std::runtime_error("Failed to read line");
    }

private:
    std::unique_ptr<std::ifstream> file_;
};

// Bad: Manual memory management
class BadFileManager {
public:
    BadFileManager(const char* filename) {
        file = new std::ifstream(filename);  // ❌ Manual allocation
    }
    
    ~BadFileManager() {
        delete file;  // ❌ Manual deletion (error-prone)
    }

private:
    std::ifstream* file;  // ❌ Raw pointer
};
```

## Error Handling

- Use exceptions for exceptional cases
- Use `std::expected` (C++23) or `std::optional` for expected failures
- Create custom exception classes
- Document all exceptions with `@throws`

Example:

```cpp
#include <stdexcept>
#include <optional>

namespace your_namespace {

class ValidationError : public std::runtime_error {
public:
    explicit ValidationError(std::string_view message, std::string_view field)
        : std::runtime_error(std::string(message))
        , field_(field) {}
    
    [[nodiscard]] const std::string& field() const noexcept { return field_; }

private:
    std::string field_;
};

class DataValidator {
public:
    /// @throws ValidationError if data is invalid
    void validate(std::string_view data) const {
        if (data.empty()) {
            throw ValidationError("Data cannot be empty", "data");
        }
    }
    
    /// @return Optional value if valid, nullopt otherwise
    [[nodiscard]] std::optional<int> tryParse(std::string_view str) const noexcept {
        try {
            return std::stoi(std::string(str));
        } catch (...) {
            return std::nullopt;
        }
    }
};

} // namespace your_namespace
```

## Threading & Concurrency

- Use `std::thread`, `std::jthread` (C++20), or `std::async`
- Use `std::mutex`, `std::shared_mutex` for synchronization
- Prefer `std::atomic` for simple shared state
- Use `std::lock_guard` or `std::scoped_lock`

Example:

```cpp
#include <mutex>
#include <shared_mutex>
#include <thread>
#include <atomic>

class ThreadSafeCounter {
public:
    void increment() {
        std::scoped_lock lock(mutex_);
        ++counter_;
    }
    
    [[nodiscard]] int get() const {
        std::shared_lock lock(mutex_);
        return counter_;
    }

private:
    mutable std::shared_mutex mutex_;
    int counter_{0};
};

// For simple atomics
class AtomicCounter {
public:
    void increment() noexcept {
        counter_.fetch_add(1, std::memory_order_relaxed);
    }
    
    [[nodiscard]] int get() const noexcept {
        return counter_.load(std::memory_order_relaxed);
    }

private:
    std::atomic<int> counter_{0};
};
```

## CI/CD Requirements

Must include GitHub Actions workflows for:

1. **Testing** (`cpp-test.yml`):
   - Test on ubuntu-latest, windows-latest, macos-latest
   - Test with GCC, Clang, MSVC
   - Upload coverage reports

2. **Linting** (`cpp-lint.yml`):
   - clang-format check
   - clang-tidy analysis
   - cppcheck static analysis

## Package Publication

### Publishing C/C++ Libraries

**Options:**
1. **Conan Center**: Public Conan repository
2. **vcpkg**: Microsoft's package manager
3. **GitHub Releases**: Binary releases
4. **Header-only**: Single-file distribution

### Conan Publication

**conanfile.py:**

```python
from conan import ConanFile
from conan.tools.cmake import CMakeToolchain, CMake, cmake_layout

class YourProjectConan(ConanFile):
    name = "your-project"
    version = "1.0.0"
    license = "MIT"
    author = "Your Name your.email@example.com"
    url = "https://github.com/your-org/your-project"
    description = "Short description"
    topics = ("cpp", "library")
    settings = "os", "compiler", "build_type", "arch"
    
    options = {
        "shared": [True, False],
        "fPIC": [True, False]
    }
    default_options = {
        "shared": False,
        "fPIC": True
    }
    
    exports_sources = "CMakeLists.txt", "src/*", "include/*"
    
    def layout(self):
        cmake_layout(self)
    
    def generate(self):
        tc = CMakeToolchain(self)
        tc.generate()
    
    def build(self):
        cmake = CMake(self)
        cmake.configure()
        cmake.build()
    
    def package(self):
        cmake = CMake(self)
        cmake.install()
    
    def package_info(self):
        self.cpp_info.libs = ["your-project"]
```

### vcpkg Publication

**vcpkg.json:**

```json
{
  "name": "your-project",
  "version": "1.0.0",
  "description": "Short description",
  "homepage": "https://github.com/your-org/your-project",
  "license": "MIT",
  "dependencies": [
    {
      "name": "vcpkg-cmake",
      "host": true
    },
    {
      "name": "vcpkg-cmake-config",
      "host": true
    }
  ]
}
```

### Publishing Checklist:

- ✅ All tests passing with sanitizers
- ✅ clang-tidy clean
- ✅ clang-format applied
- ✅ Documentation generated
- ✅ Version updated in CMakeLists.txt
- ✅ CHANGELOG.md updated
- ✅ README.md with build instructions
- ✅ LICENSE file present
- ✅ CMake config for find_package support
- ✅ Conan recipe or vcpkg portfile

<!-- CPP:END -->

