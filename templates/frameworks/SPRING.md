<!-- SPRING:START -->
# Spring Boot Framework Rules

**CRITICAL**: Every Spring service must satisfy these quality gates before merge.

## Build & Quality Commands
- Lint/format: `./gradlew checkstyleMain` or `mvn verify`
- Unit tests: `./gradlew test` or `mvn test`
- Integration tests: `./gradlew integrationTest` (if module exists)
- Static analysis: `./gradlew jacocoTestReport` to ensure 80%+ coverage

## Project Structure
- Keep domain logic in `src/main/java/.../service`
- Expose REST controllers in `controller` packages
- Isolate configuration classes under `config`
- Share DTOs via `dto` package and map with MapStruct where applicable

## Implementation Guidelines
- Manage configuration with `application.yml` profiles (dev/test/prod)
- Prefer constructor injection, avoid `@Autowired` field injection
- Wrap transactional operations with `@Transactional`
- Use `ResponseEntity` for explicit HTTP semantics
- Validate inputs using `javax.validation` annotations and `@Valid`

## Build Matrix
```bash
# Gradle
./gradlew clean check

# Maven
mvn -B clean verify
```

## Additional Checks
- Ensure `application.yml` contains defaults for new properties
- Update Flyway/Liquibase migrations when schema changes
- Keep `README` and `/docs/architecture.md` synced with new services

<!-- SPRING:END -->
