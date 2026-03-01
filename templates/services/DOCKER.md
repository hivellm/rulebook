<!-- DOCKER:START -->
# Docker Instructions

**CRITICAL**: Follow these Docker best practices for all container builds.

## Build Patterns

### Multi-Stage Builds
Use multi-stage builds to minimize final image size and separate build-time dependencies from runtime:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
RUN adduser -D appuser
USER appuser
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"
CMD ["node", "dist/index.js"]
```

### Base Image Selection
- Pin base image versions: `node:20-alpine` not `node:latest`
- Prefer `-alpine` or `-slim` variants for smaller images
- Use official images from Docker Hub verified publishers

## Security Requirements

### Non-Root User
ALL containers MUST run as a non-root user:
```dockerfile
RUN adduser -D appuser
USER appuser
```

### Secrets
- NEVER copy secrets (`.env`, credentials, keys) into image layers
- Use Docker secrets or runtime environment variables instead
- Scan images with `docker scout cves` or `trivy image` before pushing
- Add `--no-cache` to package install commands to reduce attack surface

### Image Scanning
```bash
# Docker Scout (built-in)
docker scout cves <image>

# Trivy
trivy image <image>
```

## Required Instructions

### HEALTHCHECK
ALL production images MUST include a HEALTHCHECK:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### .dockerignore Requirements
Every Docker project MUST have a `.dockerignore` file containing at minimum:
```
.git
node_modules
dist
coverage
*.log
.env*
.DS_Store
*.md
.vscode
.idea
```

## Common Patterns

### Layer Caching
Order Dockerfile instructions from least-changing to most-changing:
```dockerfile
# 1. Base image (rarely changes)
FROM node:20-alpine

# 2. System dependencies (changes rarely)
RUN apk add --no-cache curl

# 3. Package files (changes when deps change)
COPY package*.json ./
RUN npm ci --only=production

# 4. Application code (changes frequently)
COPY . .
```

### Production Optimization
```dockerfile
# Use npm ci for deterministic installs
RUN npm ci --only=production

# Remove unnecessary files
RUN rm -rf /tmp/* /var/cache/apk/*

# Set NODE_ENV
ENV NODE_ENV=production
```

## Best Practices

- Use `.dockerignore` to exclude unnecessary files from build context
- One process per container (do not run multiple services in one container)
- Use `COPY` over `ADD` unless extracting archives
- Combine RUN commands to reduce layers: `RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*`
- Set explicit `WORKDIR` instead of `RUN cd`
- Use `EXPOSE` to document listening ports
- Tag images with semantic versions, not just `latest`

<!-- DOCKER:END -->
