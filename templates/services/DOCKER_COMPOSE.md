<!-- DOCKER_COMPOSE:START -->
# Docker Compose Instructions

**CRITICAL**: Follow these Docker Compose best practices for local development and multi-container orchestration.

## Version and Structure

### File Organization
- Use `docker-compose.yml` for base configuration
- Use `docker-compose.override.yml` for local development overrides
- Use `docker-compose.prod.yml` for production-specific settings
- Do NOT commit secrets in `docker-compose.yml` — use `.env` files

### Compose File
```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
    env_file: [.env]
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
    restart: unless-stopped
```

## Required Fields Per Service

### Health Checks
ALL services MUST define a healthcheck:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 3s
  retries: 3
```

### Resource Limits
ALL services SHOULD define resource limits for production-like environments:
```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: "0.5"
    reservations:
      memory: 128M
      cpus: "0.25"
```

### Restart Policy
```yaml
restart: unless-stopped
```

### Named Volumes
Use named volumes (not bind mounts) for persistent data:
```yaml
volumes:
  postgres_data:
  redis_data:

services:
  db:
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

## Environment Variables

### Configuration
- Use `.env` file: `env_file: [.env]`
- Never hardcode credentials in docker-compose.yml
- Document all required environment variables in README or `.env.example`

### .env.example Pattern
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=myuser
DB_PASSWORD=changeme

# Redis
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=development
PORT=3000
```

## Networking

### Service Communication
- Services on the same network communicate by service name
- Use explicit networks for isolation:
```yaml
networks:
  frontend:
  backend:

services:
  app:
    networks: [frontend, backend]
  db:
    networks: [backend]
```

## Common Patterns

### Development Setup
```yaml
services:
  app:
    build: .
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
```

### Database with Init Scripts
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser"]
      interval: 10s
      retries: 5
```

## Best Practices

- Use `depends_on` with `condition: service_healthy` for startup ordering
- Pin image versions (e.g., `postgres:16-alpine`, not `postgres:latest`)
- Keep compose files DRY with YAML anchors or extension fields (`x-common`)
- Use `docker compose up --build` to rebuild images after code changes
- Run `docker compose down -v` to clean up volumes during development
- Separate concerns: one service per container

<!-- DOCKER_COMPOSE:END -->
