# Proposal: Ralph Security Gate (5th Quality Gate)

## Why

To standardize AI project setup with consistent, scalable patterns.

## Context

Ralph currently enforces 4 quality gates: type-check, lint, tests, coverage. Security scanning is a critical missing gate — especially for AI-generated code which tends to introduce common vulnerabilities (SQL injection, XSS, hardcoded secrets, insecure dependencies).

Market research shows security scanning is a top priority for teams adopting AI coding assistants.

## Solution

Add a 5th quality gate: **Security Scan** using available free tools:

1. **`npm audit`** — for Node.js projects (zero config, always available)
2. **`pip-audit`** — for Python projects
3. **`cargo audit`** — for Rust projects
4. **`trivy fs .`** — polyglot scanner, if installed
5. **`semgrep --config auto`** — if installed (OSS version)

Gate logic:
- Run the appropriate scanner(s) for detected languages
- Fail if: `npm audit` finds HIGH or CRITICAL severity vulnerabilities
- Warn (not fail) on MODERATE vulnerabilities
- Skip gate if no scanner is available (log warning)
- Gate is configurable: `ralph.securityGate: enabled/disabled/warn-only`

## New Config in rulebook.json

```json
"ralph": {
  "securityGate": {
    "enabled": true,
    "failOn": "high",  // "critical" | "high" | "moderate" | "low"
    "tool": "auto"    // "auto" | "npm-audit" | "trivy" | "semgrep"
  }
}
```

## Files to Modify

- `src/core/agent-manager.ts` — add `runSecurityGate()` as 5th gate
- `src/agents/ralph-parser.ts` — add `parseSecurityOutput()` parser
- `src/core/config-manager.ts` — add `ralph.securityGate` config schema
- `src/types.ts` — add SecurityGateConfig type
- `templates/core/RALPH.md` — document security gate
- `tests/security-gate.test.ts` — new test file
