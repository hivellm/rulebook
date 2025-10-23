<!-- RUST:START -->
# Rust Project Rules

## Rust Edition and Toolchain

**CRITICAL**: Always use Rust Edition 2024 with nightly toolchain.

- **Edition**: 2024
- **Toolchain**: nightly 1.85+
- **Update**: Run `rustup update nightly` regularly

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order:

```bash
# 1. Format code (nightly required for Edition 2024)
cargo +nightly fmt --all

# 2. Check for warnings (MUST pass with no warnings)
cargo clippy --workspace -- -D warnings

# 3. Check all targets and features
cargo clippy --workspace --all-targets --all-features -- -D warnings

# 4. Run all tests (MUST pass 100%)
cargo test --workspace --tests --verbose

# 5. Check coverage (MUST meet threshold)
cargo llvm-cov --all --ignore-filename-regex 'examples'
```

**If ANY of these fail, you MUST fix the issues before committing.**

### Formatting

- Use `rustfmt` with nightly toolchain
- Configuration in `rustfmt.toml` or `.rustfmt.toml`
- Always format before committing: `cargo +nightly fmt --all`
- CI must check formatting: `cargo +nightly fmt --all -- --check`

### Linting

- Use `clippy` with `-D warnings` (warnings as errors)
- Fix all clippy warnings before committing
- Acceptable exceptions must be documented with `#[allow(clippy::...)]` and justification
- CI must enforce clippy: `cargo clippy --workspace -- -D warnings`

### Testing

- **Location**: Tests in `/tests` directory for integration tests
- **Unit Tests**: In same file as implementation with `#[cfg(test)]`
- **Coverage**: Must meet project threshold (default 95%)
- **Tools**: Use `cargo-nextest` for faster test execution
- **Async**: Use `tokio::test` for async tests with Tokio runtime

Example test structure:
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_feature() {
        // Test implementation
    }

    #[tokio::test]
    async fn test_async_feature() {
        // Async test implementation
    }
}
```

## Async Programming

**CRITICAL**: Follow Tokio best practices for async code.

- **Runtime**: Use Tokio for async runtime
- **Blocking**: Never block in async context - use `spawn_blocking` for CPU-intensive tasks
- **Channels**: Use `tokio::sync::mpsc` or `tokio::sync::broadcast` for async communication
- **Timeouts**: Always set timeouts for network operations: `tokio::time::timeout`

Example:
```rust
use tokio::time::{timeout, Duration};

async fn fetch_data() -> Result<Data, Error> {
    timeout(Duration::from_secs(30), async {
        // Network operation
    }).await?
}
```

## Dependency Management

**CRITICAL**: Always verify latest versions before adding dependencies.

### Before Adding Any Dependency

1. **Check Context7 for latest version**:
   - Use MCP Context7 tool if available
   - Search for the crate documentation
   - Verify the latest stable version
   - Review breaking changes and migration guides

2. **Example Workflow**:
   ```
   Adding tokio → Check crates.io and docs.rs
   Adding serde → Verify latest version with security updates
   Adding axum → Check for breaking changes in latest version
   ```

3. **Document Version Choice**:
   - Note why specific version chosen in `Cargo.toml` comments
   - Document any compatibility constraints
   - Update CHANGELOG.md with new dependencies

### Dependency Guidelines

- ✅ Use latest stable versions
- ✅ Check for security advisories: `cargo audit`
- ✅ Prefer well-maintained crates (active development, good documentation)
- ✅ Minimize dependency count
- ✅ Use workspace dependencies for monorepos
- ❌ Don't use outdated versions without justification
- ❌ Don't add dependencies without checking latest version

## Codespell Configuration

**CRITICAL**: Use codespell to catch typos in code and documentation.

Install: `pip install 'codespell[toml]'`

Configuration in `pyproject.toml`:
```toml
[tool.codespell]
skip = "*.lock,*.json,target,node_modules,.git"
ignore-words-list = "crate,ser,deser"
```

Or run with flags:
```bash
codespell \
  --skip="*.lock,*.json,target,node_modules,.git" \
  --ignore-words-list="crate,ser,deser"
```

## Error Handling

- Use `Result<T, E>` for recoverable errors
- Use `thiserror` for custom error types
- Use `anyhow` for application-level error handling
- Document error conditions in function docs
- Never use `unwrap()` or `expect()` in production code without justification

Example:
```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum MyError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

pub fn process_data(input: &str) -> Result<Data, MyError> {
    // Implementation
}
```

## Documentation

- **Public APIs**: Must have doc comments (`///`)
- **Examples**: Include examples in doc comments
- **Modules**: Document module purpose with `//!`
- **Unsafe**: Always document safety requirements for `unsafe` code
- **Run doctests**: `cargo test --doc`

Example:
```rust
/// Processes the input data and returns a result.
///
/// # Arguments
///
/// * `input` - The input string to process
///
/// # Examples
///
/// ```
/// use mylib::process;
/// let result = process("hello");
/// assert_eq!(result, "HELLO");
/// ```
///
/// # Errors
///
/// Returns `MyError::InvalidInput` if input is empty.
pub fn process(input: &str) -> Result<String, MyError> {
    // Implementation
}
```

## Project Structure

```
project/
├── Cargo.toml          # Package manifest
├── Cargo.lock          # Dependency lock file (commit this)
├── README.md           # Project overview (allowed in root)
├── CHANGELOG.md        # Version history (allowed in root)
├── AGENTS.md          # AI assistant rules (allowed in root)
├── LICENSE            # Project license (allowed in root)
├── CONTRIBUTING.md    # Contribution guidelines (allowed in root)
├── CODE_OF_CONDUCT.md # Code of conduct (allowed in root)
├── SECURITY.md        # Security policy (allowed in root)
├── src/
│   ├── lib.rs          # Library root (for libraries)
│   ├── main.rs         # Binary root (for applications)
│   └── ...
├── tests/              # Integration tests
├── examples/           # Example code
├── benches/            # Benchmarks
└── docs/               # Project documentation
```

## CI/CD Requirements

Must include GitHub Actions workflows for:

1. **Testing** (`rust-test.yml`):
   - Test on ubuntu-latest, windows-latest, macos-latest
   - Use `cargo-nextest` for fast test execution
   - Upload test results

2. **Linting** (`rust-lint.yml`):
   - Format check: `cargo +nightly fmt --all -- --check`
   - Clippy: `cargo clippy --workspace -- -D warnings`
   - All targets: `cargo clippy --workspace --all-targets -- -D warnings`

3. **Codespell** (`codespell.yml`):
   - Check for typos in code and documentation
   - Fail on errors

<!-- RUST:END -->

