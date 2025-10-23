<!-- CONTEXT7:START -->
# Context7 Instructions

**CRITICAL**: Use MCP Context7 to access up-to-date library documentation before adding dependencies.

Context7 provides real-time access to documentation for thousands of libraries and frameworks. Always check Context7 before adding new dependencies to ensure you're using the latest stable versions and following best practices.

## Core Functions

### 1. resolve-library-id

Resolve a package name to a Context7-compatible library ID:

```
Input: Library name (e.g., "tokio", "react", "fastapi")
Output: Context7 library ID (e.g., "/tokio-rs/tokio", "/facebook/react")
```

**MUST** use this function before `get-library-docs` unless the user provides an explicit library ID.

### 2. get-library-docs

Fetch documentation for a library:

```
Input: Context7 library ID, optional topic, token limit
Output: Relevant documentation, examples, API reference
```

Options:
- `topic`: Focus on specific area (e.g., "routing", "hooks", "async")
- `tokens`: Control documentation size (default: 5000)

## Mandatory Usage

### Before Adding Dependencies

**CRITICAL**: Check Context7 for every new dependency.

#### Rust Example
```
Adding tokio:
1. resolve-library-id("tokio") → "/tokio-rs/tokio"
2. get-library-docs("/tokio-rs/tokio") → Latest version, features, examples
3. Check for breaking changes in latest version
4. Add to Cargo.toml with correct version and features
```

#### TypeScript Example
```
Adding express:
1. resolve-library-id("express") → "/expressjs/express"
2. get-library-docs("/expressjs/express") → Latest version, middleware patterns
3. Review TypeScript type definitions availability
4. Add to package.json with latest stable version
```

#### Python Example
```
Adding fastapi:
1. resolve-library-id("fastapi") → "/tiangolo/fastapi"
2. get-library-docs("/tiangolo/fastapi", topic="async") → Async patterns
3. Check Python version requirements
4. Add to pyproject.toml or requirements.txt
```

## Best Practices

### 1. Version Verification

Always verify the latest stable version:

```
1. Use resolve-library-id to find the library
2. Use get-library-docs to see current version
3. Check for security advisories
4. Review changelog for breaking changes
5. Document version choice in code/commits
```

### 2. Topic-Focused Queries

Use the topic parameter for specific information:

```
Examples:
- get-library-docs("/tokio-rs/tokio", topic="channels")
- get-library-docs("/facebook/react", topic="hooks")
- get-library-docs("/psf/requests", topic="authentication")
```

### 3. Migration Guides

When updating major versions:

```
1. Get docs for current version
2. Get docs for target version
3. Look for migration guide in documentation
4. Review breaking changes
5. Plan migration strategy
```

### 4. Best Practices Discovery

Learn idiomatic usage patterns:

```
1. Get library docs with relevant topic
2. Review code examples
3. Check for recommended patterns
4. Follow security best practices
5. Implement according to documentation
```

## Integration with Development Workflow

### Adding New Dependency

```
1. Identify need for library
2. Use resolve-library-id to find correct library
3. Use get-library-docs to review:
   - Latest stable version
   - Features and capabilities
   - Usage examples
   - Security considerations
4. Add dependency with correct version
5. Document why this library was chosen
6. Update CHANGELOG.md
```

### Updating Existing Dependency

```
1. Use get-library-docs for current version
2. Use get-library-docs for latest version
3. Review changelog between versions
4. Check for breaking changes
5. Update code if needed
6. Update dependency version
7. Test thoroughly
```

### Troubleshooting

```
1. Use get-library-docs with specific topic
2. Search for error message or issue
3. Review examples for correct usage
4. Check for known issues or workarounds
5. Verify you're following best practices
```

## Common Patterns

### Pattern 1: Dependency Selection

```
Problem: Need HTTP client library

1. resolve-library-id("requests") for Python
   OR resolve-library-id("reqwest") for Rust
   OR resolve-library-id("axios") for TypeScript

2. get-library-docs for each candidate

3. Compare features, performance, maintenance

4. Choose best fit for requirements

5. Document decision
```

### Pattern 2: Feature Discovery

```
Need: Async file operations in Rust

1. resolve-library-id("tokio") → "/tokio-rs/tokio"
2. get-library-docs("/tokio-rs/tokio", topic="file I/O")
3. Review async file operation examples
4. Implement using documented patterns
```

### Pattern 3: Security Verification

```
Before adding crypto library:

1. resolve-library-id("ring") for Rust
2. get-library-docs("/briansmith/ring")
3. Check security audit status
4. Review recommended algorithms
5. Verify actively maintained
6. Add with appropriate features
```

## Library ID Format

Context7 library IDs follow patterns:

- GitHub: `/org/repo` or `/org/repo/version`
- Examples:
  - `/tokio-rs/tokio`
  - `/vercel/next.js`
  - `/psf/requests`
  - `/vercel/next.js/v14.0.0` (specific version)

## Error Handling

If library not found:

1. Verify correct library name
2. Try alternative names or repos
3. Check if library is on supported platforms
4. Consider using official documentation as fallback

<!-- CONTEXT7:END -->

