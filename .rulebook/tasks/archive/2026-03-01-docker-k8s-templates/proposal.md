# Proposal: Docker and Kubernetes Templates

## Why

To detect and generate best-practice directives for container and orchestration technologies.

## Context

Container deployment is the standard for modern applications. AI agents generating code frequently produce non-production-ready Dockerfiles (no multi-stage builds, running as root, no health checks) and Kubernetes manifests without resource limits, readiness probes, or security contexts.

Rulebook should detect Docker/Kubernetes usage and provide opinionated templates and directives.

## Solution

1. **Detection**:
   - `Dockerfile` exists → Docker detected
   - `docker-compose.yml` → Docker Compose detected
   - `k8s/`, `kubernetes/`, or `*.yaml` with `kind: Deployment` → Kubernetes detected
   - `helm/` or `Chart.yaml` → Helm detected

2. **Generated specs**:
   - `DOCKER.md` — multi-stage builds, non-root user, .dockerignore, health checks
   - `KUBERNETES.md` — resource limits, readiness/liveness probes, security contexts
   - `HELM.md` — chart structure, values.yaml patterns

3. **Template Dockerfiles** (optional install):
   - Node.js multi-stage Dockerfile template
   - Python multi-stage Dockerfile template

## New Templates

- `templates/services/docker.md`
- `templates/services/docker-compose.md`
- `templates/services/kubernetes.md`
- `templates/services/helm.md`

## Files to Modify

- `src/core/detector.ts` — detect Docker/k8s/Helm
- `src/types.ts` — add container service types
- `src/core/generator.ts` — generate container specs
- `tests/docker-k8s.test.ts` — new test file
