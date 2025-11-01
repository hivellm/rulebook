<!-- JAVASCRIPT:START -->
# JavaScript Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
npm run lint              # Linting (0 warnings required)
npm run format            # Code formatting
npm test                  # All tests (100% pass required)
npm run test:coverage     # Coverage check (95%+ required)
npm run build             # Build verification (if applicable)

# Security audit:
npm audit --production    # Vulnerability scan
npm outdated              # Check outdated deps
```

## JavaScript Configuration

**CRITICAL**: Use modern JavaScript (ES2022+) with strict linting and testing.

- **Version**: Node.js 18+
- **Recommended**: Node.js 22 LTS
- **Standard**: ES2022 or later
- **Module System**: ESM (ES Modules)
- **Type**: Set `"type": "module"` in package.json

### package.json Requirements

```json
{
  "name": "your-package",
  "version": "1.0.0",
  "description": "Package description",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": {
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "esbuild src/index.js --bundle --platform=node --outfile=dist/index.js",
    "test": "vitest --run",
    "test:watch": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/**/*.js tests/**/*.js",
    "lint:fix": "eslint src/**/*.js tests/**/*.js --fix",
    "format": "prettier --write 'src/**/*.js' 'tests/**/*.js'",
    "format:check": "prettier --check 'src/**/*.js' 'tests/**/*.js'"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "devDependencies": {
    "eslint": "^9.19.0",
    "prettier": "^3.4.0",
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "esbuild": "^0.24.0"
  }
}
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Lint (MUST pass with no warnings - matches workflow)
npm run lint

# 2. Format check (matches workflow - use check, not write!)
npm run format:check
# or: npx prettier --check 'src/**/*.js' 'tests/**/*.js'

# 3. Run all tests (MUST pass 100% - matches workflow)
npm test

# 4. Build (if applicable - matches workflow)
npm run build

# 5. Check coverage (MUST meet threshold)
npm run test:coverage

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- Running different commands locally than in CI causes "works on my machine" failures
- CI/CD workflows will fail if commands don't match
- Example: Using `prettier --write` locally but `prettier --check` in CI = failure
- Example: Skipping lint locally = CI ESLint failures catch errors you missed

### Linting

- Use ESLint 9+ with flat config
- Configuration in `eslint.config.js`
- Must pass with no warnings
- Use recommended rule sets

Example `eslint.config.js`:
```javascript
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Allow console in Node.js
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
```

### Formatting

- Use Prettier for code formatting
- Configuration in `.prettierrc.json`
- Integrate with ESLint for consistency
- Format before committing

Example `.prettierrc.json`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

### Testing

- **Framework**: Vitest (recommended), Jest, or Mocha
- **Location**: `/tests` directory
- **Coverage**: Must meet project threshold (default 80%)
- **Watch Mode**: Use `vitest` or `vitest --watch` for development
- **CI Mode**: **CRITICAL** - Default `npm test` command MUST include `--run` flag
  - This prevents Vitest from entering watch mode, which never terminates
  - In `package.json`: `"test": "vitest --run"`
  - For manual development, use `npm run test:watch`

Example test structure:
```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { myFunction } from '../src/module.js';

describe('myFunction', () => {
  let testData;

  beforeEach(() => {
    testData = { value: 'test' };
  });

  afterEach(() => {
    // Cleanup
  });

  it('should return expected value', () => {
    const result = myFunction(testData);
    expect(result).toBe('expected');
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction(null)).toThrow('Invalid input');
  });
});
```

## Module System

- Use ES modules (`import`/`export`)
- Set `"type": "module"` in `package.json`
- Use `.js` extensions in imports for Node.js compatibility
- No CommonJS (`require`/`module.exports`) in new code

Example:
```javascript
// Good: ES modules with .js extension
import { myFunction } from './my-module.js';
import fs from 'node:fs';

export { myFunction };
export default class MyClass {}
```

```javascript
// Bad: CommonJS
const { myFunction } = require('./my-module');
module.exports = { myFunction };
```

## Error Handling

- Always handle errors explicitly
- Use try/catch for async operations
- Create custom error classes for domain errors
- Never swallow errors silently

Example:
```javascript
export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ValidationError('Invalid URL', 'url');
    }
    throw error;
  }
}
```

## Documentation

- Use JSDoc for documentation
- Document all public APIs
- Include examples
- Export types for consumers (if using TypeScript types via JSDoc)

Example:
```javascript
/**
 * Processes the input data and returns a formatted result.
 *
 * @param {string} input - The input string to process
 * @param {Object} [options] - Optional processing options
 * @param {boolean} [options.trim=false] - Whether to trim whitespace
 * @returns {string} The processed string in uppercase
 * @throws {ValidationError} If input is empty
 *
 * @example
 * ```javascript
 * const result = process('hello', { trim: true });
 * console.log(result); // 'HELLO'
 * ```
 */
export function process(input, options = {}) {
  if (!input) {
    throw new ValidationError('Input cannot be empty', 'input');
  }
  const processed = options.trim ? input.trim() : input;
  return processed.toUpperCase();
}
```

## Async/Await Patterns

- Always use async/await (not callbacks or raw promises)
- Handle promise rejections
- Use Promise.all for concurrent operations
- Avoid blocking operations

Example:
```javascript
// Good: Async/await with error handling
export async function processMultiple(urls) {
  try {
    const results = await Promise.all(
      urls.map(url => fetchData(url))
    );
    return results;
  } catch (error) {
    console.error('Failed to process URLs:', error);
    throw error;
  }
}

// Bad: Callback hell
function processMultipleCallback(urls, callback) {
  let results = [];
  urls.forEach((url, i) => {
    fetchDataCallback(url, (err, data) => {
      if (err) return callback(err);
      results.push(data);
      if (i === urls.length - 1) callback(null, results);
    });
  });
}
```

## Package Management

**CRITICAL**: Use consistent package manager across team.

- **Default**: npm (most compatible, built-in)
- **Alternative**: pnpm (fast, disk-efficient) or yarn
- **Lockfile**: Always commit lockfile (`package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`)
  - **IMPORTANT**: GitHub Actions `setup-node` with `cache: 'npm'` requires lockfile to be committed
  - Without lockfile: CI/CD fails with "Dependencies lock file is not found"
  - Solution: Commit `package-lock.json` and use `npm ci` in workflows

### Dependencies

1. **Check for latest versions**:
   - Use Context7 MCP tool if available
   - Check npm registry: `npm view <package> versions`
   - Review changelog for breaking changes

2. **Dependency Guidelines**:
   - ✅ Use exact versions for applications (`"1.2.3"`)
   - ✅ Use semver for libraries (`"^1.2.3"`)
   - ✅ Keep dependencies updated regularly
   - ✅ Use `npm audit` for security
   - ❌ Don't use deprecated packages
   - ❌ Don't add unnecessary dependencies

## CI/CD Requirements

**CRITICAL**: GitHub Actions `cache: 'npm'` requires `package-lock.json` to be committed.

Must include GitHub Actions workflows for:

1. **Testing** (`javascript-test.yml`):
   - Test on ubuntu-latest, windows-latest, macos-latest
   - Node.js versions: 18.x, 20.x, 22.x
   - Use Vitest for fast execution
   - Upload coverage reports
   - **MUST**: Commit package-lock.json for caching

2. **Linting** (`javascript-lint.yml`):
   - ESLint: `npm run lint`
   - Prettier: `npm run format:check`
   - **MUST**: Commit package-lock.json for caching

3. **Build** (`javascript-build.yml`):
   - Build: `npm run build`
   - Verify output artifacts
   - **MUST**: Commit package-lock.json for caching

## Project Structure

```
project/
├── package.json        # Package manifest
├── package-lock.json   # Lockfile (MUST commit for CI cache)
├── eslint.config.js    # ESLint configuration
├── .prettierrc.json    # Prettier configuration
├── vitest.config.js    # Test configuration
├── README.md           # Project overview
├── LICENSE             # Project license
├── src/
│   ├── index.js        # Main entry point
│   └── ...
├── tests/              # Test files
├── dist/               # Build output (gitignored)
└── docs/               # Documentation
```

## Best Practices

### DO's ✅

- **USE** modern ES2022+ features
- **USE** async/await for asynchronous code
- **USE** strict equality (`===`) over loose equality (`==`)
- **VALIDATE** all inputs
- **HANDLE** errors explicitly
- **DOCUMENT** public APIs with JSDoc
- **TEST** all code paths
- **KEEP** dependencies minimal and updated

### DON'Ts ❌

- **NEVER** use `var` (use `const` or `let`)
- **NEVER** use `==` (use `===`)
- **NEVER** swallow errors silently
- **NEVER** commit `node_modules/`
- **NEVER** commit `.env` files
- **NEVER** use deprecated packages
- **NEVER** skip tests
- **NEVER** commit console.log debugging code

## Security

- Never commit secrets or API keys
- Use environment variables for sensitive data
- Run `npm audit` regularly
- Keep dependencies updated
- Use `.env` files (add to `.gitignore`)

Example `.env`:
```bash
API_KEY=your-secret-key
DATABASE_URL=postgres://localhost/db
```

Load with:
```javascript
import 'dotenv/config';

const apiKey = process.env.API_KEY;
```

<!-- JAVASCRIPT:END -->
