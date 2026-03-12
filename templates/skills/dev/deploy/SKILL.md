---
name: deploy
description: Prepare deployment artifacts and verify CI/CD readiness
model: sonnet
context: fork
agent: devops-engineer
---
Prepare the project for deployment.

If $ARGUMENTS is provided, focus on that specific deployment target or environment.

Steps:
1. Verify the build succeeds with no errors
2. Check CI/CD pipeline configuration is valid
3. Validate environment variables and secrets are documented
4. Review Dockerfile or deployment configs if present
5. Generate a deployment checklist with any missing items
