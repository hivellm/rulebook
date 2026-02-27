---
name: "Elixir"
description: "Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow)."
version: "1.0.0"
category: "languages"
author: "Rulebook"
tags: ["languages", "language"]
dependencies: []
conflicts: []
---
<!-- ELIXIR:START -->
# Elixir Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
mix format --check-formatted  # Format check
mix credo --strict        # Linting
mix dialyzer              # Type checking
mix test                  # All tests (100% pass)
mix test --cover          # Coverage (95%+ required)
mix compile --warnings-as-errors  # Build

# Security audit:
mix hex.audit             # Vulnerability scan
mix hex.outdated          # Check outdated deps
```

## Elixir Configuration

**CRITICAL**: Use Elixir 1.16+ with OTP 26+.

- **Version**: Elixir 1.16+
- **OTP**: 26+
- **Formatter**: Built-in `mix format`
- **Linter**: Credo
- **Type Checker**: Dialyzer

### mix.exs Requirements

```elixir
defmodule YourProject.MixProject do
  use Mix.Project

  def project do
    [
      app: :your_project,
      version: "1.0.0",
      elixir: "~> 1.16",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      
      # Documentation
      name: "Your Project",
      source_url: "https://github.com/your-org/your-project",
      docs: [
        main: "readme",
        extras: ["README.md", "CHANGELOG.md"]
      ],
      
      # Testing
      test_coverage: [tool: ExCoveralls],
      preferred_cli_env: [
        coveralls: :test,
        "coveralls.detail": :test,
        "coveralls.post": :test,
        "coveralls.html": :test
      ],
      
      # Dialyzer
      dialyzer: [
        plt_add_apps: [:mix, :ex_unit],
        plt_file: {:no_warn, "priv/plts/dialyzer.plt"},
        flags: [:error_handling, :underspecs]
      ]
    ]
  end

  def application do
    [
      extra_applications: [:logger],
      mod: {YourProject.Application, []}
    ]
  end

  defp deps do
    [
      # Development & Testing
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:dialyxir, "~> 1.4", only: [:dev, :test], runtime: false},
      {:excoveralls, "~> 0.18", only: :test},
      {:ex_doc, "~> 0.31", only: :dev, runtime: false}
    ]
  end
end
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow - use --check-formatted!)
mix format --check-formatted

# 2. Lint (MUST pass with no warnings - matches workflow)
mix credo --strict

# 3. Type check with Dialyzer (matches workflow)
mix dialyzer

# 4. Run all tests (MUST pass 100% - matches workflow)
mix test --cover

# 5. Check coverage (MUST meet threshold)
mix test --cover --export-coverage default
mix test.coverage

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- CI/CD failures happen when local commands differ from workflows
- Example: Using `mix format` locally but `mix format --check-formatted` in CI = failure
- Example: Missing `--cover` flag = CI coverage failures

### Formatting

- Use built-in `mix format`
- Configuration in `.formatter.exs`
- Format before committing: `mix format`

Example `.formatter.exs`:
```elixir
[
  inputs: ["{mix,.formatter}.exs", "{config,lib,test}/**/*.{ex,exs}"],
  line_length: 100
]
```

### Linting

- Use Credo for code analysis
- Configuration in `.credo.exs`
- Must pass strict mode: `mix credo --strict`

Example `.credo.exs`:
```elixir
%{
  configs: [
    %{
      name: "default",
      files: %{
        included: ["lib/", "test/"],
        excluded: [~r"/_build/", ~r"/deps/"]
      },
      strict: true,
      color: true,
      checks: %{
        enabled: [
          {Credo.Check.Readability.ModuleDoc, []},
          {Credo.Check.Design.AliasUsage, priority: :low}
        ]
      }
    }
  ]
}
```

### Testing

- **Framework**: ExUnit (built-in)
- **Location**: `test/` directory
- **Coverage**: ExCoveralls
- **Coverage Threshold**: 95%+

Example test structure:
```elixir
defmodule YourProject.MyModuleTest do
  use ExUnit.Case, async: true
  
  doctest YourProject.MyModule

  describe "function_name/1" do
    test "handles valid input" do
      assert YourProject.MyModule.function_name("input") == {:ok, "result"}
    end

    test "returns error for invalid input" do
      assert YourProject.MyModule.function_name("") == {:error, :invalid_input}
    end
  end
end
```

### Type Specifications

- Use `@spec` for all public functions
- Use `@type` for custom types
- Run Dialyzer regularly

Example:
```elixir
defmodule YourProject.MyModule do
  @moduledoc """
  Documentation for MyModule.
  """

  @type result :: {:ok, String.t()} | {:error, atom()}

  @spec process(String.t()) :: result()
  def process(input) when is_binary(input) and input != "" do
    {:ok, String.upcase(input)}
  end

  def process(_), do: {:error, :invalid_input}
end
```

## Documentation

- Use `@moduledoc` for module documentation
- Use `@doc` for function documentation
- Include examples with doctests
- Generate docs with `mix docs`

Example:
```elixir
defmodule YourProject.MyModule do
  @moduledoc """
  Provides functionality for processing data.

  ## Examples

      iex> YourProject.MyModule.process("hello")
      {:ok, "HELLO"}
  """

  @doc """
  Processes the input string.

  Returns `{:ok, result}` on success or `{:error, reason}` on failure.

  ## Examples

      iex> YourProject.MyModule.process("test")
      {:ok, "TEST"}

      iex> YourProject.MyModule.process("")
      {:error, :invalid_input}
  """
  @spec process(String.t()) :: {:ok, String.t()} | {:error, atom()}
  def process(input) when is_binary(input) and input != "" do
    {:ok, String.upcase(input)}
  end

  def process(_), do: {:error, :invalid_input}
end
```

## Project Structure

```
project/
├── mix.exs             # Project configuration
├── .formatter.exs      # Formatter configuration
├── .credo.exs          # Credo configuration
├── README.md           # Project overview (allowed in root)
├── CHANGELOG.md        # Version history (allowed in root)
├── LICENSE             # Project license (allowed in root)
├── lib/
│   ├── your_project.ex       # Main module
│   └── your_project/
│       ├── application.ex    # OTP application
│       └── ...
├── test/
│   ├── test_helper.exs      # Test configuration
│   └── your_project/
│       └── ...
├── config/
│   ├── config.exs           # General config
│   ├── dev.exs              # Development config
│   ├── test.exs             # Test config
│   └── prod.exs             # Production config
├── priv/                    # Private assets
└── docs/                    # Project documentation
```

## Error Handling

- Use tagged tuples: `{:ok, value}` and `{:error, reason}`
- Use `with` for multiple operations
- Create custom error modules when needed

Example:
```elixir
defmodule YourProject.Errors do
  defmodule ValidationError do
    defexception [:message, :field]
  end
end

defmodule YourProject.MyModule do
  alias YourProject.Errors.ValidationError

  def validate(data) do
    with {:ok, cleaned} <- clean_data(data),
         {:ok, validated} <- check_format(cleaned) do
      {:ok, validated}
    else
      {:error, :empty} -> 
        raise ValidationError, message: "Data cannot be empty", field: :data
      
      {:error, reason} -> 
        {:error, reason}
    end
  end
end
```

## OTP Best Practices

- Use Supervisors for fault tolerance
- Implement GenServers for stateful processes
- Use Task for concurrent operations

Example Supervisor:
```elixir
defmodule YourProject.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {YourProject.MyWorker, []},
      {Task.Supervisor, name: YourProject.TaskSupervisor}
    ]

    opts = [strategy: :one_for_one, name: YourProject.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

## CI/CD Requirements

Must include GitHub Actions workflows for:

1. **Testing** (`elixir-test.yml`):
   - Test on ubuntu-latest
   - Test on Elixir 1.16, 1.17
   - Test on OTP 26, 27
   - Upload coverage reports

2. **Linting** (`elixir-lint.yml`):
   - Format check: `mix format --check-formatted`
   - Credo: `mix credo --strict`
   - Dialyzer: `mix dialyzer`

## Package Publication

### Publishing to Hex.pm

**Prerequisites:**
1. Create account at https://hex.pm
2. Generate API key: `mix hex.user auth`
3. Add `HEX_API_KEY` to GitHub repository secrets

**mix.exs Configuration:**

```elixir
def project do
  [
    app: :your_package,
    version: "1.0.0",
    elixir: "~> 1.16",
    description: "A short description of your package",
    package: package(),
    docs: docs()
  ]
end

defp package do
  [
    name: :your_package,
    files: ~w(lib .formatter.exs mix.exs README.md LICENSE CHANGELOG.md),
    licenses: ["MIT"],
    links: %{
      "GitHub" => "https://github.com/your-org/your-package",
      "Changelog" => "https://github.com/your-org/your-package/blob/main/CHANGELOG.md"
    },
    maintainers: ["Your Name"]
  ]
end

defp docs do
  [
    main: "readme",
    extras: ["README.md", "CHANGELOG.md"],
    source_url: "https://github.com/your-org/your-package"
  ]
end
```

**Publishing Workflow:**

1. Update version in mix.exs
2. Update CHANGELOG.md
3. Run quality checks:
   ```bash
   mix format
   mix credo --strict
   mix dialyzer
   mix test
   mix coveralls
   ```

4. Build docs: `mix docs`
5. Build package: `mix hex.build`
6. Create git tag: `git tag v1.0.0 && git push --tags`
7. GitHub Actions automatically publishes to Hex
8. Or manual publish: `mix hex.publish`

**Publishing Checklist:**

- ✅ All tests passing (`mix test`)
- ✅ Coverage meets threshold (`mix coveralls`)
- ✅ Credo passes strict mode (`mix credo --strict`)
- ✅ Dialyzer passes (`mix dialyzer`)
- ✅ Code formatted (`mix format --check-formatted`)
- ✅ Version updated in mix.exs
- ✅ CHANGELOG.md updated
- ✅ README.md up to date
- ✅ LICENSE file present
- ✅ Documentation builds (`mix docs`)
- ✅ Package metadata complete in mix.exs
- ✅ Verify with `mix hex.build`

**Semantic Versioning:**

Follow [SemVer](https://semver.org/):
- **MAJOR**: Breaking API changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

**Documentation:**

HexDocs automatically generates documentation from your code:
- Published at: `https://hexdocs.pm/your_package`
- Updated automatically when publishing to Hex

<!-- ELIXIR:END -->

