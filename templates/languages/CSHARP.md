<!-- CSHARP:START -->
# C# Project Rules

## C# Configuration

**CRITICAL**: Use .NET 8+ with C# 12+.

- **Version**: .NET 8.0+
- **C# Version**: 12+
- **Target**: net8.0
- **Nullable**: Enabled
- **LangVersion**: latest

### Project File Requirements

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <AnalysisMode>All</AnalysisMode>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    
    <!-- Package Metadata -->
    <PackageId>Your.Package.Name</PackageId>
    <Version>1.0.0</Version>
    <Authors>Your Name</Authors>
    <Company>Your Company</Company>
    <Description>A short description of your package</Description>
    <PackageLicenseExpression>MIT</PackageLicenseExpression>
    <PackageProjectUrl>https://github.com/your-org/your-project</PackageProjectUrl>
    <RepositoryUrl>https://github.com/your-org/your-project</RepositoryUrl>
    <RepositoryType>git</RepositoryType>
    <PackageTags>your;tags</PackageTags>
    
    <!-- Documentation -->
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <NoWarn>$(NoWarn);1591</NoWarn>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.CodeAnalysis.NetAnalyzers" Version="8.0.0">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers</IncludeAssets>
    </PackageReference>
  </ItemGroup>
</Project>
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order:

```bash
# 1. Format code
dotnet format

# 2. Build (MUST pass with no warnings)
dotnet build --no-incremental

# 3. Run all tests (MUST pass 100%)
dotnet test

# 4. Check coverage (MUST meet threshold)
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=opencover
```

**If ANY of these fail, you MUST fix the issues before committing.**

### Code Style

Use `.editorconfig` for consistent code style:

```ini
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 4
insert_final_newline = true
trim_trailing_whitespace = true

[*.{cs,csx,vb,vbx}]
indent_size = 4

# C# Code Style Rules
[*.cs]
# Organize usings
dotnet_sort_system_directives_first = true
dotnet_separate_import_directive_groups = false

# this. preferences
dotnet_style_qualification_for_field = false:warning
dotnet_style_qualification_for_property = false:warning
dotnet_style_qualification_for_method = false:warning
dotnet_style_qualification_for_event = false:warning

# Language keywords vs BCL types preferences
dotnet_style_predefined_type_for_locals_parameters_members = true:warning
dotnet_style_predefined_type_for_member_access = true:warning

# Modifier preferences
dotnet_style_require_accessibility_modifiers = always:warning
csharp_preferred_modifier_order = public,private,protected,internal,static,extern,new,virtual,abstract,sealed,override,readonly,unsafe,volatile,async:warning

# Expression preferences
csharp_style_var_for_built_in_types = true:warning
csharp_style_var_when_type_is_apparent = true:warning
csharp_style_var_elsewhere = true:warning

# Pattern matching
csharp_style_pattern_matching_over_is_with_cast_check = true:warning
csharp_style_pattern_matching_over_as_with_null_check = true:warning

# Null-checking preferences
csharp_style_throw_expression = true:warning
csharp_style_conditional_delegate_call = true:warning

# Code block preferences
csharp_prefer_braces = true:warning
csharp_prefer_simple_using_statement = true:warning

# Naming conventions
dotnet_naming_rule.interface_should_be_begins_with_i.severity = warning
dotnet_naming_rule.interface_should_be_begins_with_i.symbols = interface
dotnet_naming_rule.interface_should_be_begins_with_i.style = begins_with_i

dotnet_naming_rule.types_should_be_pascal_case.severity = warning
dotnet_naming_rule.types_should_be_pascal_case.symbols = types
dotnet_naming_rule.types_should_be_pascal_case.style = pascal_case

dotnet_naming_rule.non_field_members_should_be_pascal_case.severity = warning
dotnet_naming_rule.non_field_members_should_be_pascal_case.symbols = non_field_members
dotnet_naming_rule.non_field_members_should_be_pascal_case.style = pascal_case

# Symbol specifications
dotnet_naming_symbols.interface.applicable_kinds = interface
dotnet_naming_symbols.interface.applicable_accessibilities = public, internal, private, protected, protected_internal, private_protected

dotnet_naming_symbols.types.applicable_kinds = class, struct, interface, enum
dotnet_naming_symbols.types.applicable_accessibilities = public, internal, private, protected, protected_internal, private_protected

dotnet_naming_symbols.non_field_members.applicable_kinds = property, event, method
dotnet_naming_symbols.non_field_members.applicable_accessibilities = public, internal, private, protected, protected_internal, private_protected

# Naming styles
dotnet_naming_style.begins_with_i.required_prefix = I
dotnet_naming_style.begins_with_i.required_suffix = 
dotnet_naming_style.begins_with_i.word_separator = 
dotnet_naming_style.begins_with_i.capitalization = pascal_case

dotnet_naming_style.pascal_case.required_prefix = 
dotnet_naming_style.pascal_case.required_suffix = 
dotnet_naming_style.pascal_case.word_separator = 
dotnet_naming_style.pascal_case.capitalization = pascal_case
```

### Testing

- **Framework**: xUnit (recommended) or NUnit
- **Location**: Separate test project
- **Coverage**: Coverlet
- **Coverage Threshold**: 95%+

Example test structure:
```csharp
using Xunit;

namespace YourProject.Tests;

public class MyClassTests
{
    [Fact]
    public void Process_ValidInput_ReturnsExpectedResult()
    {
        // Arrange
        var sut = new MyClass();
        var input = "test";

        // Act
        var result = sut.Process(input);

        // Assert
        Assert.Equal("TEST", result);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void Process_InvalidInput_ThrowsArgumentException(string input)
    {
        // Arrange
        var sut = new MyClass();

        // Act & Assert
        Assert.Throws<ArgumentException>(() => sut.Process(input));
    }
}
```

### Documentation

- Use XML documentation comments
- Document all public APIs
- Include `<summary>`, `<param>`, `<returns>`, `<exception>`

Example:
```csharp
namespace YourProject;

/// <summary>
/// Provides functionality for processing data.
/// </summary>
public class MyClass
{
    /// <summary>
    /// Processes the input string and converts it to uppercase.
    /// </summary>
    /// <param name="input">The input string to process.</param>
    /// <returns>The processed string in uppercase.</returns>
    /// <exception cref="ArgumentException">Thrown when input is null or empty.</exception>
    /// <example>
    /// <code>
    /// var processor = new MyClass();
    /// var result = processor.Process("hello");
    /// // result is "HELLO"
    /// </code>
    /// </example>
    public string Process(string input)
    {
        if (string.IsNullOrEmpty(input))
        {
            throw new ArgumentException("Input cannot be null or empty.", nameof(input));
        }

        return input.ToUpperInvariant();
    }
}
```

## Project Structure

```
project/
├── src/
│   └── YourProject/
│       ├── YourProject.csproj
│       ├── Class1.cs
│       └── ...
├── tests/
│   └── YourProject.Tests/
│       ├── YourProject.Tests.csproj
│       ├── Class1Tests.cs
│       └── ...
├── docs/                    # Project documentation
├── .editorconfig            # Code style configuration
├── Directory.Build.props    # Shared MSBuild properties
├── Directory.Packages.props # Central package management
├── YourProject.sln          # Solution file
├── README.md                # Project overview (allowed in root)
├── CHANGELOG.md             # Version history (allowed in root)
└── LICENSE                  # Project license (allowed in root)
```

## Nullable Reference Types

- Enable nullable reference types
- Use `?` for nullable types
- Use null-forgiving operator `!` sparingly

Example:
```csharp
public class UserService
{
    private readonly ILogger<UserService> _logger;

    public UserService(ILogger<UserService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public User? FindUser(string? username)
    {
        if (string.IsNullOrEmpty(username))
        {
            return null;
        }

        // Implementation
        return new User { Username = username };
    }

    public User GetUser(string username)
    {
        var user = FindUser(username);
        return user ?? throw new InvalidOperationException("User not found");
    }
}
```

## Async/Await Best Practices

- Use `async`/`await` for I/O operations
- Don't block on async code
- Use `ConfigureAwait(false)` in libraries
- Return `Task` or `ValueTask`

Example:
```csharp
public class DataService
{
    private readonly HttpClient _httpClient;

    public async Task<string> FetchDataAsync(string url, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetAsync(url, cancellationToken).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        
        return await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
    }
}
```

## CI/CD Requirements

Must include GitHub Actions workflows for:

1. **Testing** (`dotnet-test.yml`):
   - Test on ubuntu-latest, windows-latest, macos-latest
   - Test on .NET 8.0
   - Upload coverage reports

2. **Linting** (`dotnet-lint.yml`):
   - Format check: `dotnet format --verify-no-changes`
   - Build: `dotnet build --no-incremental`
   - Analyzers enabled

## Package Publication

### Publishing to NuGet

**Prerequisites:**
1. Create account at https://www.nuget.org
2. Generate API key from account settings
3. Add `NUGET_API_KEY` to GitHub repository secrets

**Publishing Workflow:**

1. Update version in .csproj
2. Update CHANGELOG.md
3. Run quality checks:
   ```bash
   dotnet format --verify-no-changes
   dotnet build --configuration Release
   dotnet test --configuration Release
   ```

4. Pack: `dotnet pack --configuration Release`
5. Create git tag: `git tag v1.0.0 && git push --tags`
6. GitHub Actions automatically publishes to NuGet
7. Or manual publish: `dotnet nuget push bin/Release/*.nupkg --api-key $NUGET_API_KEY --source https://api.nuget.org/v3/index.json`

**Publishing Checklist:**

- ✅ All tests passing
- ✅ Code formatted (`dotnet format`)
- ✅ No build warnings
- ✅ Version updated in .csproj
- ✅ CHANGELOG.md updated
- ✅ README.md up to date
- ✅ LICENSE file present
- ✅ XML documentation generated
- ✅ Package metadata complete
- ✅ Verify with `dotnet pack`

**Semantic Versioning:**

Use `<Version>` in .csproj with SemVer:
- **MAJOR**: Breaking API changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

<!-- CSHARP:END -->

