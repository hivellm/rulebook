---
name: security-audit
description: Run a security audit on the project (dependencies, secrets, OWASP)
model: haiku
context: fork
agent: security-reviewer
---
Perform a comprehensive security audit of this project.

If $ARGUMENTS is provided, focus the audit on that specific area.

Steps:
1. Run dependency audit (npm audit, pip-audit, cargo audit, etc.)
2. Scan for hardcoded secrets, API keys, and credentials
3. Review authentication and authorization patterns
4. Check for OWASP Top 10 vulnerabilities in the codebase
5. Report findings categorized by severity (critical/high/medium/low)
