<!-- JULIA:START -->
# Julia Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
julia -e 'using JuliaFormatter; format(".", overwrite=false)'  # Format check
julia -e 'using Lint; lintpkg(".")'  # Linting
julia --project=. -e 'using Pkg; Pkg.test()'  # All tests

# Security audit:
julia -e 'using Pkg; Pkg.update()'  # Update deps
```

## Julia Configuration

**CRITICAL**: Use Julia 1.9+ with JuliaFormatter and testing.

- **Version**: Julia 1.9+
- **Formatter**: JuliaFormatter.jl
- **Linter**: Lint.jl
- **Testing**: Test.jl (standard library)
- **Documentation**: Documenter.jl

### Project.toml Requirements

```toml
name = "YourPackage"
uuid = "12345678-1234-1234-1234-123456789012"
authors = ["Your Name <you@example.com>"]
version = "0.1.0"

[deps]
LinearAlgebra = "37e2e46d-f89d-539d-b4ee-838fcccc9c8e"

[compat]
julia = "1.9"

[extras]
Test = "8dfed614-e22c-5e08-85e1-65c5234f0b40"

[targets]
test = ["Test"]
```

## Code Quality Standards

### Mandatory Quality Checks

**IMPORTANT**: These commands MUST match your GitHub Actions workflows!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow)
julia -e 'using JuliaFormatter; format(".", overwrite=false)'

# 2. Lint (matches workflow)
julia -e 'using Lint; lintpkg("YourPackage")'

# 3. Run all tests (MUST pass 100% - matches workflow)
julia --project=. -e 'using Pkg; Pkg.test()'

# 4. Check coverage (matches workflow)
julia --project=. --code-coverage=user -e 'using Pkg; Pkg.test()'

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**Why This Matters:**
- Example: Using `format(..., overwrite=true)` locally but `overwrite=false` in CI = failure

### Testing Example

```julia
using Test
using YourPackage

@testset "DataProcessor tests" begin
    @testset "process function" begin
        @test process([1, 2, 3]) == [2, 4, 6]
        @test process([]) == []
        @test_throws ArgumentError process(nothing)
    end
    
    @testset "validate function" begin
        @test validate("test") == true
        @test validate("") == false
    end
end
```

<!-- JULIA:END -->

