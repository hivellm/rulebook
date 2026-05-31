<!-- PYTEST:START -->
# pytest Rules

## Conventions
- Use `pytest.fixture` with explicit `scope` (`"function"` default, `"session"` for expensive setup like DB engines).
- Prefer `conftest.py` for shared fixtures; scope conftest files to the directory that needs them.
- Use `pytest.mark.parametrize` for data-driven tests; name parameters descriptively with `ids=` when values are not self-documenting.
- Assert with plain `assert` statements — pytest rewrites them for detailed diffs; avoid `unittest.TestCase` assertion methods.
- Use `pytest-asyncio` with `asyncio_mode = "auto"` in `pyproject.toml` for async test functions; mark individual tests with `@pytest.mark.asyncio` only when not using auto mode.
- Isolate side effects with `monkeypatch` or `unittest.mock.patch` as a context manager; prefer `monkeypatch` for environment variables and file system changes.

## Avoid
- Using `setup_method`/`teardown_method` — replace with fixtures using appropriate scope.
- Importing test utilities from test files directly; put shared helpers in `conftest.py` or a `tests/helpers/` module.
- Writing tests that depend on execution order — each test must be independently runnable.
- Silencing warnings with `filterwarnings = "ignore"` globally; address root causes or scope suppressions narrowly.
<!-- PYTEST:END -->
