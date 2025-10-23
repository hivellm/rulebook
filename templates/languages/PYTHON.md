<!-- PYTHON:START -->
# Python Project Rules

## Python Version

**CRITICAL**: Use Python 3.11+ for modern features and performance.

- **Minimum Version**: Python 3.11+
- **Recommended**: Python 3.12+
- **Type Hints**: Required for all public APIs

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order:

```bash
# 1. Format code
ruff format .

# 2. Lint (MUST pass with no warnings)
ruff check .

# 3. Type check
mypy .

# 4. Run all tests (MUST pass 100%)
pytest

# 5. Check coverage (MUST meet threshold)
pytest --cov=. --cov-report=term --cov-report=html
```

**If ANY of these fail, you MUST fix the issues before committing.**

### Formatting

- Use `ruff format` (fast, modern) or `black` (traditional)
- Line length: 100 characters (configurable)
- Consistent formatting across entire project
- Format before committing

Configuration in `pyproject.toml`:
```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

### Linting

- Use `ruff check` (fast, comprehensive) or `ruff` + `flake8`
- Fix all linting errors before committing
- Document any disabled rules with justification

Configuration in `pyproject.toml`:
```toml
[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "A", "C4", "SIM"]
ignore = ["E501"]  # Line too long (handled by formatter)

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101"]  # Allow assert in tests
```

### Type Checking

- Use `mypy` for static type checking
- All public APIs must have type hints
- Use `typing` module for complex types
- Gradual typing allowed for legacy code

Configuration in `pyproject.toml`:
```toml
[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
```

Example:
```python
from typing import Optional, List, Dict, Any

def process_data(
    input_data: str,
    options: Optional[Dict[str, Any]] = None
) -> List[str]:
    """Process input data and return results."""
    # Implementation
    return []
```

### Testing

- **Framework**: pytest
- **Location**: `/tests` directory
- **Coverage**: Must meet project threshold (default 95%)
- **Fixtures**: Use pytest fixtures for setup/teardown
- **Parametrize**: Use `@pytest.mark.parametrize` for multiple test cases

Example test structure:
```python
import pytest
from mymodule import process_data

@pytest.fixture
def sample_data():
    """Provide sample data for tests."""
    return "test input"

def test_process_data_valid_input(sample_data):
    """Test process_data with valid input."""
    result = process_data(sample_data)
    assert result == ["expected"]

@pytest.mark.parametrize("input_val,expected", [
    ("hello", ["HELLO"]),
    ("world", ["WORLD"]),
])
def test_process_data_parametrized(input_val, expected):
    """Test multiple input cases."""
    result = process_data(input_val)
    assert result == expected
```

## Dependency Management

**CRITICAL**: Use modern dependency management tools.

### Recommended: Poetry

```toml
[tool.poetry]
name = "myproject"
version = "0.1.0"
description = ""
authors = ["Your Name <you@example.com>"]

[tool.poetry.dependencies]
python = "^3.11"
requests = "^2.31.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
mypy = "^1.5.0"
ruff = "^0.1.0"
```

Commands:
```bash
poetry install              # Install dependencies
poetry add requests         # Add dependency
poetry add --group dev pytest  # Add dev dependency
poetry update               # Update dependencies
```

### Alternative: pip-tools

```
# requirements.in
requests>=2.31.0
pydantic>=2.0.0

# requirements-dev.in
-r requirements.in
pytest>=7.4.0
mypy>=1.5.0
```

Commands:
```bash
pip-compile requirements.in
pip-compile requirements-dev.in
pip-sync requirements-dev.txt
```

### Dependency Guidelines

1. **Check for latest versions**:
   - Use Context7 MCP tool if available
   - Check PyPI: `pip index versions <package>`
   - Review changelog for breaking changes

2. **Version pinning**:
   - ✅ Pin exact versions in applications
   - ✅ Use ranges in libraries (`>=1.0,<2.0`)
   - ✅ Keep dependencies updated regularly
   - ❌ Don't use outdated packages with security issues

## Error Handling

- Use specific exception types
- Create custom exceptions when needed
- Document exceptions in docstrings
- Never use bare `except:`

Example:
```python
class ValidationError(Exception):
    """Raised when data validation fails."""
    
    def __init__(self, message: str, field: str):
        super().__init__(message)
        self.field = field

def validate_data(data: dict[str, Any]) -> None:
    """
    Validate input data.
    
    Args:
        data: The data to validate
        
    Raises:
        ValidationError: If validation fails
    """
    if not isinstance(data, dict):
        raise ValidationError("Data must be a dictionary", "data")
```

## Documentation

- **Docstrings**: Google or NumPy style
- **Type hints**: Required for public APIs
- **README**: Include installation and usage
- **API docs**: Consider Sphinx for large projects

Example (Google style):
```python
def process_data(input_data: str, options: dict[str, Any] | None = None) -> list[str]:
    """
    Process input data and return results.
    
    Args:
        input_data: The input string to process
        options: Optional processing options
        
    Returns:
        A list of processed strings
        
    Raises:
        ValidationError: If input_data is empty
        
    Examples:
        >>> process_data("hello")
        ['HELLO']
        >>> process_data("world", {"lowercase": True})
        ['world']
    """
    # Implementation
    return []
```

## Project Structure

```
project/
├── pyproject.toml      # Project metadata and dependencies
├── README.md           # Project overview (allowed in root)
├── CHANGELOG.md        # Version history (allowed in root)
├── AGENTS.md          # AI assistant rules (allowed in root)
├── LICENSE            # Project license (allowed in root)
├── CONTRIBUTING.md    # Contribution guidelines (allowed in root)
├── CODE_OF_CONDUCT.md # Code of conduct (allowed in root)
├── SECURITY.md        # Security policy (allowed in root)
├── src/
│   └── mypackage/
│       ├── __init__.py
│       ├── module.py
│       └── py.typed    # PEP 561 marker for type hints
├── tests/              # Test files
│   ├── __init__.py
│   └── test_module.py
└── docs/               # Documentation
```

## Async Programming

- Use `asyncio` for async code
- Type hints: `async def func() -> Coroutine`
- Testing: Use `pytest-asyncio`

Example:
```python
import asyncio
from typing import List

async def fetch_data(url: str) -> dict[str, Any]:
    """Fetch data asynchronously."""
    # Implementation
    return {}

async def main() -> None:
    """Main async function."""
    results = await asyncio.gather(
        fetch_data("url1"),
        fetch_data("url2"),
    )
    print(results)

if __name__ == "__main__":
    asyncio.run(main())
```

## CI/CD Requirements

Must include GitHub Actions workflows for:

1. **Testing** (`python-test.yml`):
   - Test on ubuntu-latest, windows-latest, macos-latest
   - Test on Python 3.11, 3.12
   - Upload coverage reports

2. **Linting** (`python-lint.yml`):
   - Format check: `ruff format --check .`
   - Lint: `ruff check .`
   - Type check: `mypy .`

3. **Security** (`python-security.yml`):
   - Check for vulnerabilities: `pip-audit`
   - Scan dependencies: `safety check`

<!-- PYTHON:END -->

