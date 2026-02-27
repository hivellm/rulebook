<!-- PYTHON:START -->
# Python Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
ruff format --check .      # Format check
ruff check .               # Linting
mypy .                     # Type checking
pytest                     # All tests (100% pass required)
pytest --cov               # Coverage check (95%+ required)

# Security audit:
pip-audit                  # Vulnerability scan
pip list --outdated        # Check outdated deps
```

## Python Version

**CRITICAL**: Use Python 3.11+ for modern features and performance.

- **Minimum Version**: Python 3.11+
- **Recommended**: Python 3.12+
- **Type Hints**: Required for all public APIs

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

### Test Categories: S2S and Slow Tests

**CRITICAL**: Tests must be categorized based on execution time and dependencies.

#### Test Time Limits

- **Fast Tests**: Must complete in ≤ 10-20 seconds
- **Slow Tests**: Any test taking > 10-20 seconds must be marked as slow
- **S2S Tests**: Tests requiring active server/database must be isolated and run on-demand

#### S2S (Server-to-Server) Tests

**Tests that require active servers, databases, or external services must be isolated using pytest markers.**

**Implementation**:

1. **Mark S2S tests with pytest markers**:
```python
import pytest
import os

# Regular fast test (always runs)
def test_local_computation():
    """Fast test, no external dependencies."""
    result = compute_locally("input")
    assert result == "expected"

# S2S test (only runs with -m s2s)
@pytest.mark.s2s
def test_database_connection():
    """Requires active database server."""
    db = connect_to_database()
    # ... test implementation

@pytest.mark.s2s
def test_api_integration():
    """Requires active API server."""
    client = create_api_client()
    # ... test implementation
```

2. **Configure `pytest.ini` or `pyproject.toml`**:
```ini
# pytest.ini
[pytest]
markers =
    s2s: Server-to-server tests requiring active services
    slow: Slow tests taking > 20 seconds
```

Or in `pyproject.toml`:
```toml
[tool.pytest.ini_options]
markers = [
    "s2s: Server-to-server tests requiring active services",
    "slow: Slow tests taking > 20 seconds",
]
```

3. **Run tests**:
```bash
# Regular tests (excludes S2S)
pytest

# Include S2S tests (requires active servers)
pytest -m s2s

# Run all tests including S2S
pytest -m "not slow"  # Fast + S2S, excludes slow
```

#### Slow Tests

**Tests that take > 10-20 seconds must be marked and run separately.**

**Implementation**:

1. **Mark slow tests with pytest markers**:
```python
import pytest

# Fast test (always runs)
def test_quick_operation():
    """Completes in < 1 second."""
    result = quick_compute("input")
    assert result == "expected"

# Slow test (only runs with -m slow)
@pytest.mark.slow
def test_heavy_computation():
    """Takes 30+ seconds."""
    # Heavy processing, large dataset, etc.
    result = process_large_dataset()
    assert result is not None

@pytest.mark.slow
def test_large_file_processing():
    """Processes large files, takes > 20 seconds."""
    result = process_file("large_file.dat")
    assert result.success
```

2. **Run tests**:
```bash
# Regular tests (excludes slow and S2S)
pytest -m "not slow and not s2s"

# Include slow tests
pytest -m slow

# Run all tests
pytest -m ""  # Empty marker means all tests
```

3. **Add pytest configuration for timeouts**:
```python
# conftest.py
import pytest

@pytest.fixture(autouse=True)
def configure_timeouts(request):
    """Configure timeouts based on test markers."""
    if 'slow' in request.keywords:
        request.node.add_marker(pytest.mark.timeout(300))  # 5 minutes
    elif 's2s' in request.keywords:
        request.node.add_marker(pytest.mark.timeout(60))  # 1 minute
    else:
        request.node.add_marker(pytest.mark.timeout(20))  # 20 seconds
```

4. **Add scripts in `pyproject.toml` or `setup.py`**:
```toml
[tool.poetry.scripts]
test = "pytest -m 'not slow and not s2s'"
test-s2s = "pytest -m s2s"
test-slow = "pytest -m slow"
test-all = "pytest"
```

#### Best Practices

- ✅ **Always run fast tests** in CI/CD by default
- ✅ **Isolate S2S tests** - never run them in standard test suite
- ✅ **Mark slow tests** - prevent CI/CD timeouts
- ✅ **Document requirements** - specify which servers/services are needed for S2S tests
- ✅ **Use timeouts** - Set appropriate timeouts: `@pytest.mark.timeout(60)`
- ✅ **Use pytest markers** - `@pytest.mark.s2s` and `@pytest.mark.slow`
- ✅ **Skip conditionally** - `@pytest.mark.skipif(not os.getenv('RUN_S2S_TESTS'), reason='S2S tests disabled')`
- ❌ **Never mix** fast and slow/S2S tests in same test run
- ❌ **Never require** external services for standard test suite
- ❌ **Never exceed** 10-20 seconds for regular tests

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

## Package Publication

### Publishing to PyPI

**Prerequisites:**
1. Create account at https://pypi.org
2. Enable 2FA for security
3. Configure trusted publishing (recommended) or create API token
4. For trusted publishing: Add GitHub as publisher in PyPI settings

**pyproject.toml Configuration:**

```toml
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "your-package-name"
version = "1.0.0"
description = "A short description of your package"
readme = "README.md"
requires-python = ">=3.11"
license = {text = "MIT"}
authors = [
    {name = "Your Name", email = "your.email@example.com"}
]
keywords = ["your", "keywords"]
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
]
dependencies = [
    "requests>=2.31.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-cov>=4.1.0",
    "ruff>=0.1.0",
    "mypy>=1.7.0",
    "black>=23.12.0",
]

[project.urls]
Homepage = "https://github.com/your-org/your-package"
Documentation = "https://your-package.readthedocs.io"
Repository = "https://github.com/your-org/your-package"
"Bug Tracker" = "https://github.com/your-org/your-package/issues"

[tool.setuptools.packages.find]
where = ["src"]

[tool.setuptools.package-data]
your_package = ["py.typed"]
```

### PEP 625 Package Naming Convention

**CRITICAL**: Package names must be normalized according to PEP 625.

PyPI requires source distribution filenames to use normalized package names (underscores instead of hyphens).

**Naming Rules:**

1. **Package name in `pyproject.toml`**: Use underscores (`_`)
   ```toml
   [project]
   name = "my_package_name"  # Correct
   # NOT: name = "my-package-name"  # Will cause deprecation warning
   ```

2. **Package directory**: Must match with underscores
   ```
   src/
   └── my_package_name/     # Correct
       ├── __init__.py
       └── ...
   ```

3. **Import statement**: Uses underscores
   ```python
   import my_package_name
   from my_package_name import something
   ```

4. **Distribution filename**: Will be `my_package_name-1.0.0.tar.gz` ✅

**Common Issue:**

If you use hyphens in the package name, PyPI will reject new uploads:
```toml
# ❌ WRONG - Will fail PEP 625 compliance
[project]
name = "my-package-name"

# Result: my-package-name-1.0.0.tar.gz (non-compliant)
# PyPI Error: "Filename does not contain normalized project name"
```

**Correct Approach:**
```toml
# ✅ CORRECT - PEP 625 compliant
[project]
name = "my_package_name"

# Result: my_package_name-1.0.0.tar.gz (compliant)
# PyPI: Accepts upload without warnings
```

**Migration from Hyphenated Names:**

If you previously published with hyphens:

1. Update `pyproject.toml` and `setup.py` to use underscores
2. Existing uploads remain on PyPI (no action needed)
3. Future uploads will use normalized name
4. PyPI will automatically redirect:
   - `pip install my-package-name` → works (auto-normalized)
   - `pip install my_package_name` → works (canonical form)
5. Import statement unchanged: `import my_package_name`

**Reference**: [PEP 625 - File name of a Source Distribution](https://peps.python.org/pep-0625/)

**Publishing Workflow:**

1. Update version in pyproject.toml
2. Update CHANGELOG.md
3. Run quality checks:
   ```bash
   ruff check .
   ruff format --check .
   mypy .
   pytest
   ```
4. Build package:
   ```bash
   python -m build
   twine check dist/*
   ```
5. Test on Test PyPI (optional):
   ```bash
   twine upload --repository testpypi dist/*
   ```
6. Create git tag: `git tag v1.0.0 && git push --tags`
7. GitHub Actions automatically publishes to PyPI
8. Or manual publish: `twine upload dist/*`

**Publishing Checklist:**

- ✅ All tests passing (`pytest`)
- ✅ Type checking passes (`mypy .`)
- ✅ Linting passes (`ruff check .`)
- ✅ Code formatted (`ruff format .`)
- ✅ Version updated in pyproject.toml
- ✅ CHANGELOG.md updated
- ✅ README.md up to date
- ✅ LICENSE file present
- ✅ **Package name uses underscores (PEP 625 compliant)**
- ✅ `py.typed` marker for type hints
- ✅ Package builds successfully (`python -m build`)
- ✅ Package checks pass (`twine check dist/*`)
- ✅ Manifest complete (`check-manifest`)
- ✅ **Verify dist filename**: `my_package-1.0.0.tar.gz` (underscores) ✅

**Trusted Publishing (Recommended):**

PyPI trusted publishing eliminates the need for API tokens:

1. Go to PyPI → Your Account → Publishing
2. Add a new pending publisher:
   - PyPI Project Name: `your-package-name`
   - Owner: `your-github-org`
   - Repository: `your-repo-name`
   - Workflow: `python-publish.yml`
   - Environment: `release` (optional)

3. GitHub Actions will authenticate automatically using OIDC

**Versioning:**

Use semantic versioning and consider:
- **Automated versioning**: Use tools like `bump2version` or `setuptools_scm`
- **Version from git tags**: Configure `setuptools_scm` in pyproject.toml:

```toml
[build-system]
requires = ["setuptools>=68.0", "setuptools_scm>=8.0"]

[tool.setuptools_scm]
version_file = "src/your_package/_version.py"
```

**Type Hints:**

Include `py.typed` marker for PEP 561 compliance:
```bash
touch src/your_package/py.typed
```

This tells type checkers your package includes type information.

<!-- PYTHON:END -->

