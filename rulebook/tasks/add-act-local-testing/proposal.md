# Proposal: Add ACT Local Testing

## Why

There are discrepancies between running tests locally (WSL/PowerShell) and on GitHub Actions. Some projects pass tests locally but fail in CI, causing frustration and rework. ACT (Action Container Toolkit) allows simulating the GitHub Actions environment locally, detecting issues before push. This feature is completely optional and must work on Windows, Linux, and Mac, with automatic dependency detection and clear configuration instructions.

## What Changes

Add optional support for running tests using ACT, which simulates the GitHub Actions environment locally. The implementation must:

1. Detect and install Docker (if not present) with clear instructions
2. Detect and install ACT (if not present)
3. Create scripts to run GitHub Actions workflows locally
4. Anticipate and warn about requirements (e.g., expose Docker daemon TCP)
5. Work on Windows, Linux, and Mac
6. Be completely optional (not break if Docker/ACT are not available)
7. Provide clear error messages and configuration instructions

## Impact

- Affected specs: `specs/cli/spec.md` (new command), `specs/core/spec.md` (new functionality)
- Affected code: `src/cli/commands.ts` (new command), `src/core/act-runner.ts` (new class), installation scripts
- Breaking change: NO
- User benefit: Detects CI issues before push, reduces rework and frustration
