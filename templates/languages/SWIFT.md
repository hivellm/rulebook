<!-- SWIFT:START -->
# Swift Project Rules

## Swift Configuration

**CRITICAL**: Use Swift 5.10+ with strict concurrency checking.

- **Version**: Swift 5.10+
- **Platform**: iOS 17+, macOS 14+
- **Concurrency**: Enabled
- **Warnings as Errors**: true

### Package.swift Requirements

```swift
// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "YourPackage",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
        .watchOS(.v10),
        .tvOS(.v17)
    ],
    products: [
        .library(
            name: "YourPackage",
            targets: ["YourPackage"]
        ),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "YourPackage",
            dependencies: [],
            swiftSettings: [
                .enableUpcomingFeature("StrictConcurrency"),
                .enableUpcomingFeature("BareSlashRegexLiterals"),
                .enableExperimentalFeature("StrictConcurrency=complete")
            ]
        ),
        .testTarget(
            name: "YourPackageTests",
            dependencies: ["YourPackage"]
        ),
    ]
)
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow - use lint mode, not --in-place!)
swift-format lint --recursive Sources Tests

# 2. Lint (matches workflow)
swiftlint lint --strict

# 3. Build (MUST pass with no warnings - matches workflow)
swift build -Xswiftc -warnings-as-errors

# 4. Run all tests (MUST pass 100% - matches workflow)
swift test --enable-code-coverage

# 5. Generate documentation (matches workflow)
swift package generate-documentation

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- CI/CD failures happen when local commands differ from workflows
- Example: Using `swift-format --in-place` locally but `lint` in CI = failure
- Example: Missing `--enable-code-coverage` = CI coverage failures

### Code Style

Use SwiftLint for code style. Configuration in `.swiftlint.yml`:

```yaml
disabled_rules:
  - trailing_whitespace

opt_in_rules:
  - empty_count
  - explicit_init
  - first_where
  - closure_spacing
  - overridden_super_call
  - redundant_nil_coalescing
  - private_outlet
  - nimble_operator
  - attributes
  - operator_usage_whitespace
  - closure_end_indentation
  - literal_expression_end_indentation

included:
  - Sources
  - Tests

excluded:
  - .build
  - .swiftpm
  - DerivedData

line_length:
  warning: 120
  error: 140
  ignores_comments: true

type_body_length:
  warning: 300
  error: 400

file_length:
  warning: 500
  error: 800

function_body_length:
  warning: 40
  error: 60

identifier_name:
  min_length:
    warning: 2
  max_length:
    warning: 50
    error: 60

custom_rules:
  no_hardcoded_strings:
    name: "No Hardcoded Strings"
    regex: '(print|NSLog)\("'
    message: "Use localized strings instead of hardcoded strings"
    severity: warning
```

### Testing

- **Framework**: XCTest (built-in)
- **Location**: `Tests/` directory
- **Async**: Use async/await in tests
- **Coverage**: xcodebuild or swift-testing

Example test:

```swift
import XCTest
@testable import YourPackage

final class YourPackageTests: XCTestCase {
    func testProcessValidInput() async throws {
        let processor = DataProcessor()
        let result = try await processor.process("hello")
        
        XCTAssertEqual(result, "HELLO")
    }
    
    func testProcessEmptyInputThrowsError() async {
        let processor = DataProcessor()
        
        await XCTAssertThrowsError(try await processor.process("")) { error in
            XCTAssertEqual(error as? ProcessorError, .emptyInput)
        }
    }
    
    func testPerformanceExample() {
        let processor = DataProcessor()
        
        measure {
            _ = try? processor.processSync("test")
        }
    }
}

// Helper extension for async testing
extension XCTestCase {
    func XCTAssertThrowsError<T>(
        _ expression: @autoclosure () async throws -> T,
        _ errorHandler: (Error) -> Void
    ) async {
        do {
            _ = try await expression()
            XCTFail("Should have thrown an error")
        } catch {
            errorHandler(error)
        }
    }
}
```

### Documentation

- Use Swift DocC for documentation
- Document all public APIs with `///`
- Include examples and parameters

Example:

```swift
/// A processor that transforms input data.
///
/// Use this class to process strings and perform transformations.
/// The processor supports both synchronous and asynchronous operations.
///
/// ## Usage
///
/// ```swift
/// let processor = DataProcessor()
/// let result = try await processor.process("hello")
/// print(result) // Prints: HELLO
/// ```
public final class DataProcessor: Sendable {
    
    /// Creates a new data processor.
    public init() {}
    
    /// Processes the input string asynchronously.
    ///
    /// This method transforms the input by converting it to uppercase.
    ///
    /// - Parameter input: The string to process. Must not be empty.
    /// - Returns: The processed string in uppercase.
    /// - Throws: `ProcessorError.emptyInput` if the input is empty.
    ///
    /// ## Example
    ///
    /// ```swift
    /// let processor = DataProcessor()
    /// let result = try await processor.process("hello")
    /// // result is "HELLO"
    /// ```
    public func process(_ input: String) async throws -> String {
        guard !input.isEmpty else {
            throw ProcessorError.emptyInput
        }
        
        return input.uppercased()
    }
}

/// Errors that can occur during processing.
public enum ProcessorError: Error, Sendable {
    /// The input string was empty.
    case emptyInput
    /// An invalid format was encountered.
    case invalidFormat(String)
}
```

### Concurrency

- Use `async`/`await` for asynchronous code
- Mark types as `Sendable` when thread-safe
- Use actors for state synchronization
- Enable strict concurrency checking

Example:

```swift
/// An actor that manages user data safely across concurrent access.
public actor UserManager {
    private var users: [String: User] = [:]
    
    /// Adds or updates a user.
    public func setUser(_ user: User, for id: String) {
        users[id] = user
    }
    
    /// Retrieves a user by ID.
    public func getUser(for id: String) -> User? {
        users[id]
    }
}

/// A thread-safe data structure.
public struct User: Sendable {
    public let id: String
    public let name: String
    public let email: String
    
    public init(id: String, name: String, email: String) {
        self.id = id
        self.name = name
        self.email = email
    }
}

/// Example of using actors with async/await
public final class UserService: Sendable {
    private let manager = UserManager()
    
    public init() {}
    
    public func fetchUser(id: String) async -> User? {
        // Actor-isolated access
        await manager.getUser(for: id)
    }
    
    public func saveUser(_ user: User) async {
        await manager.setUser(user, for: user.id)
    }
}
```

## Project Structure

```
project/
├── Package.swift           # Swift Package Manager manifest
├── .swiftlint.yml          # SwiftLint configuration
├── .swift-format           # SwiftFormat configuration
├── README.md               # Project overview (allowed in root)
├── CHANGELOG.md            # Version history (allowed in root)
├── LICENSE                 # Project license (allowed in root)
├── Sources/
│   └── YourPackage/
│       ├── YourPackage.swift
│       └── ...
├── Tests/
│   └── YourPackageTests/
│       └── YourPackageTests.swift
└── docs/                   # Project documentation
```

## Error Handling

- Use Swift's native error handling
- Create custom error types conforming to `Error`
- Use `Result` type for functions that don't throw
- Implement `LocalizedError` for user-facing errors

Example:

```swift
public enum NetworkError: Error {
    case invalidURL
    case noData
    case decodingFailed(Error)
    case httpError(statusCode: Int)
}

extension NetworkError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "The URL provided was invalid."
        case .noData:
            return "No data was received from the server."
        case .decodingFailed(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .httpError(let statusCode):
            return "HTTP error occurred with status code: \(statusCode)"
        }
    }
}
```

## CI/CD Requirements

Must include GitHub Actions workflows for:

1. **Testing** (`swift-test.yml`):
   - Test on macos-latest
   - Test on Swift 5.10
   - Run on iOS, macOS platforms

2. **Linting** (`swift-lint.yml`):
   - SwiftLint: `swiftlint`
   - SwiftFormat: `swift-format lint --recursive .`
   - Build with warnings as errors

## Package Publication

### Publishing Swift Packages

Swift packages are published via Git tags and automatically indexed by Swift Package Index.

**Prerequisites:**
1. Public Git repository
2. Valid Package.swift
3. Semantic version tags

**Publishing Workflow:**

1. Update version documentation
2. Update CHANGELOG.md
3. Run quality checks:
   ```bash
   swift-format --in-place --recursive Sources Tests
   swiftlint
   swift build -Xswiftc -warnings-as-errors
   swift test
   ```

4. Create git tag: `git tag 1.0.0 && git push --tags`
5. Add to Swift Package Index: https://swiftpackageindex.com/add-a-package
6. Package available via Swift Package Manager

**Publishing Checklist:**

- ✅ All tests passing
- ✅ SwiftLint passes
- ✅ Code formatted with swift-format
- ✅ Build succeeds with warnings as errors
- ✅ CHANGELOG.md updated
- ✅ README.md with installation instructions
- ✅ LICENSE file present
- ✅ Documentation generated with DocC
- ✅ Package.swift metadata complete
- ✅ Semantic version tag created

**Package.swift Metadata:**

```swift
let package = Package(
    name: "YourPackage",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "YourPackage", targets: ["YourPackage"]),
    ],
    targets: [
        .target(name: "YourPackage"),
        .testTarget(name: "YourPackageTests", dependencies: ["YourPackage"]),
    ]
)
```

**Usage by Consumers:**

```swift
dependencies: [
    .package(url: "https://github.com/your-org/your-package.git", from: "1.0.0")
]
```

<!-- SWIFT:END -->

