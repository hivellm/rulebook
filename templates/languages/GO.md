<!-- GO:START -->
# Go Project Rules

## Go Version

**CRITICAL**: Use Go 1.21+ for modern features and performance.

- **Minimum Version**: Go 1.21+
- **Recommended**: Go 1.22+
- **Module System**: Go modules enabled

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow - use -l to check, not -w!)
test -z "$(gofmt -l .)"

# 2. Lint (MUST pass with no warnings - matches workflow)
golangci-lint run

# 3. Vet code (matches workflow)
go vet ./...

# 4. Run all tests (MUST pass 100% - matches workflow)
go test ./... -v -race -coverprofile=coverage.out

# 5. Check coverage (MUST meet threshold)
go tool cover -func=coverage.out

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- Running different commands locally than in CI causes "works on my machine" failures
- CI/CD workflows will fail if commands don't match
- Example: Using `gofmt -w .` locally but `gofmt -l .` in CI = failure
- Example: Missing `-race` flag locally = CI race condition failures

### Formatting

- Use `gofmt` or `goimports` for code formatting
- Standard Go formatting is non-negotiable
- Format before committing: `gofmt -w .`
- CI must check formatting: `gofmt -l . | wc -l` should be 0

### Linting

- Use `golangci-lint` with recommended linters
- Configuration in `.golangci.yml`
- Must pass with no issues
- Enable linters: govet, errcheck, staticcheck, gosimple, unused

Example `.golangci.yml`:
```yaml
linters:
  enable:
    - govet
    - errcheck
    - staticcheck
    - gosimple
    - unused
    - gosec
    - gocyclo
    - gofmt
    - goimports
    
linters-settings:
  gocyclo:
    min-complexity: 15
  govet:
    check-shadowing: true
    
issues:
  exclude-use-default: false
```

### Testing

- **Framework**: Standard testing package
- **Location**: `*_test.go` files in same package
- **Coverage**: Must meet project threshold (default 95%)
- **Table-Driven Tests**: Use for multiple test cases
- **Subtests**: Use `t.Run()` for organized tests

Example test structure:
```go
package mypackage

import (
    "testing"
)

func TestMyFunction(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    string
        wantErr bool
    }{
        {"valid input", "test", "TEST", false},
        {"empty input", "", "", true},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := MyFunction(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("MyFunction() error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            if got != tt.want {
                t.Errorf("MyFunction() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

## Dependency Management

**CRITICAL**: Use Go modules for dependency management.

### go.mod and go.sum

```bash
# Initialize module
go mod init github.com/username/project

# Add dependency
go get github.com/package/name@latest

# Update dependencies
go get -u ./...
go mod tidy

# Verify dependencies
go mod verify
```

### Dependency Guidelines

1. **Check for latest versions**:
   - Use Context7 MCP tool if available
   - Check pkg.go.dev for documentation
   - Review changelog for breaking changes

2. **Version Selection**:
   - ✅ Use latest stable versions
   - ✅ Pin to specific versions for reproducibility
   - ✅ Keep dependencies updated regularly
   - ✅ Use `go mod tidy` to remove unused
   - ❌ Don't use deprecated packages
   - ❌ Don't vendor unless necessary

## Error Handling

- Always return errors, don't panic
- Use custom error types with `fmt.Errorf`
- Wrap errors with context: `fmt.Errorf("operation failed: %w", err)`
- Check all errors, never ignore
- Use `errors.Is()` and `errors.As()` for error checking

Example:
```go
package mypackage

import (
    "errors"
    "fmt"
)

var (
    ErrInvalidInput = errors.New("invalid input")
    ErrNotFound     = errors.New("not found")
)

func ProcessData(input string) (string, error) {
    if input == "" {
        return "", fmt.Errorf("process data: %w", ErrInvalidInput)
    }
    
    result, err := doSomething(input)
    if err != nil {
        return "", fmt.Errorf("failed to process: %w", err)
    }
    
    return result, nil
}
```

## Documentation

- **Package docs**: Use package comments
- **Function docs**: Document all exported functions
- **Examples**: Include in doc comments (will run as tests)
- **Run godoc**: `go doc -all`

Example:
```go
// Package auth provides authentication and authorization utilities.
//
// This package implements JWT-based authentication following OAuth 2.0
// standards. All functions are thread-safe.
package auth

// Authenticate verifies user credentials and returns a JWT token.
//
// The token is valid for 24 hours and includes the user's ID and roles.
//
// Example:
//
//	token, err := Authenticate("user@example.com", "password")
//	if err != nil {
//	    log.Fatal(err)
//	}
//	fmt.Println("Token:", token)
//
// Returns an error if credentials are invalid or database is unreachable.
func Authenticate(email, password string) (string, error) {
    // Implementation
    return "", nil
}
```

## Project Structure

```
project/
├── go.mod              # Module definition
├── go.sum              # Dependency checksums (commit this)
├── README.md           # Project overview (allowed in root)
├── CHANGELOG.md        # Version history (allowed in root)
├── AGENTS.md          # AI assistant rules (allowed in root)
├── LICENSE            # Project license (allowed in root)
├── CONTRIBUTING.md    # Contribution guidelines (allowed in root)
├── CODE_OF_CONDUCT.md # Code of conduct (allowed in root)
├── SECURITY.md        # Security policy (allowed in root)
├── cmd/
│   └── myapp/
│       └── main.go     # Application entry point
├── internal/           # Private packages
│   └── module/
│       ├── module.go
│       └── module_test.go
├── pkg/                # Public packages
│   └── api/
│       ├── api.go
│       └── api_test.go
├── tests/              # Integration tests
└── docs/               # Documentation
```

## Concurrency

- Use goroutines for concurrent operations
- Use channels for communication
- Use `sync.WaitGroup` for synchronization
- Use context for cancellation and timeouts
- Avoid shared memory, prefer channels

Example:
```go
func ProcessConcurrently(items []string) ([]Result, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    results := make(chan Result, len(items))
    errors := make(chan error, len(items))
    
    var wg sync.WaitGroup
    for _, item := range items {
        wg.Add(1)
        go func(item string) {
            defer wg.Done()
            
            select {
            case <-ctx.Done():
                errors <- ctx.Err()
                return
            default:
                result, err := processItem(item)
                if err != nil {
                    errors <- err
                    return
                }
                results <- result
            }
        }(item)
    }
    
    wg.Wait()
    close(results)
    close(errors)
    
    // Collect results
    var finalResults []Result
    for r := range results {
        finalResults = append(finalResults, r)
    }
    
    // Check for errors
    for err := range errors {
        if err != nil {
            return nil, err
        }
    }
    
    return finalResults, nil
}
```

## CI/CD Requirements

Must include GitHub Actions workflows for:

1. **Testing** (`go-test.yml`):
   - Test on ubuntu-latest, windows-latest, macos-latest
   - Test on Go 1.21, 1.22
   - Upload coverage reports

2. **Linting** (`go-lint.yml`):
   - Format check: `gofmt -l .`
   - Lint: `golangci-lint run`
   - Vet: `go vet ./...`

3. **Build** (`go-build.yml`):
   - Build: `go build ./...`
   - Verify binaries work

## Module Publication

### Publishing Go Modules

Go modules are published via Git tags and automatically indexed by pkg.go.dev.

**Prerequisites:**
1. Public Git repository (GitHub, GitLab, etc.)
2. Proper go.mod configuration
3. Semantic versioning tags

**go.mod Configuration:**

```go
module github.com/your-org/your-module

go 1.22

require (
    github.com/example/dependency v1.2.3
)
```

**Publishing Workflow:**

1. Ensure go.mod is correct:
   ```bash
   go mod tidy
   go mod verify
   ```

2. Run quality checks:
   ```bash
   go fmt ./...
   go vet ./...
   golangci-lint run
   go test -v -race ./...
   ```

3. Create semantic version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

4. pkg.go.dev automatically indexes the module
5. Verify at: `https://pkg.go.dev/github.com/your-org/your-module@v1.0.0`

**Publishing Checklist:**

- ✅ All tests passing (`go test ./...`)
- ✅ No race conditions (`go test -race ./...`)
- ✅ Code formatted (`go fmt ./...`)
- ✅ No vet warnings (`go vet ./...`)
- ✅ golangci-lint passes
- ✅ go.mod is tidy (`go mod tidy`)
- ✅ README.md with examples
- ✅ LICENSE file present
- ✅ Semantic version tag (v1.0.0)
- ✅ CHANGELOG.md updated

**Semantic Versioning:**

Go uses semantic versioning strictly:

- **v1.0.0** - First stable release
- **v1.1.0** - New features (backwards compatible)
- **v1.0.1** - Bug fixes
- **v2.0.0** - Breaking changes (requires /v2 in module path)

**Major Version Updates (v2+):**

For v2 and above, update module path:

```go
// go.mod
module github.com/your-org/your-module/v2

go 1.22
```

**Module Documentation:**

Write godoc-compatible comments:

```go
// Package yourmodule provides functionality for X, Y, and Z.
//
// Basic usage:
//
//	import "github.com/your-org/your-module"
//
//	result, err := yourmodule.Process("input")
//	if err != nil {
//	    log.Fatal(err)
//	}
package yourmodule

// Process handles the input and returns a result.
//
// Example:
//
//	result, err := Process("hello")
//	if err != nil {
//	    return err
//	}
//	fmt.Println(result)
func Process(input string) (string, error) {
    // Implementation
}
```

**GOPROXY:**

Go modules are automatically cached in public proxies:
- https://proxy.golang.org (default)
- https://goproxy.io
- https://goproxy.cn

No manual publication needed!

**Retraction:**

To retract a published version:

```go
// go.mod
retract v1.0.5 // Critical bug in processing
```

<!-- GO:END -->

