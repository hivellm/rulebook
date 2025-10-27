<!-- TYPESCRIPT:START -->
# TypeScript Project Rules

## TypeScript Configuration

**CRITICAL**: Use TypeScript 5.3+ with strict mode enabled.

- **Version**: TypeScript 5.3+
- **Mode**: Strict mode enabled
- **Target**: ES2022 or later
- **Module**: ESNext with Node16 module resolution

### tsconfig.json Requirements

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Type check (matches workflow)
npm run type-check  # or: tsc --noEmit

# 2. Lint (MUST pass with no warnings - matches workflow)
npm run lint

# 3. Format check (matches workflow - use same command as CI)
npx prettier --check 'src/**/*.ts' 'tests/**/*.ts'

# 4. Run all tests (MUST pass 100% - matches workflow)
npm test

# 5. Build (MUST succeed - matches workflow)
npm run build

# 6. Check coverage (MUST meet threshold)
npm run test:coverage
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- Running different commands locally than in CI causes "works on my machine" failures
- CI/CD workflows will fail if commands don't match
- Example: Using `prettier --write` locally but `prettier --check` in CI = failure
- Example: Forgetting `npm run build` locally = CI build failures

### Linting

- Use ESLint with TypeScript plugin
- Configuration in `eslint.config.js` or `.eslintrc.json`
- Must pass with no warnings: `eslint src/**/*.ts`
- Fix automatically when possible: `eslint src/**/*.ts --fix`

Example ESLint config:
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### Formatting

- Use Prettier for code formatting
- Configuration in `.prettierrc.json`
- Integrate with ESLint for consistency
- Format before committing: `prettier --write "src/**/*.ts"`

Example Prettier config:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Testing

- **Framework**: Vitest (recommended) or Jest
- **Location**: `/tests` directory or co-located `*.test.ts` files
- **Coverage**: Must meet project threshold (default 95%)
- **Watch Mode**: Use `vitest` or `vitest --watch` for development
- **CI Mode**: **CRITICAL** - Default `npm test` command MUST include `--run` flag
  - This prevents Vitest from entering watch mode, which never terminates
  - In `package.json`: `"test": "vitest --run"`
  - In CI workflows: use `npm test` (do NOT add `--run` argument)
  - For manual development, use `npm run test:watch`

Example test structure:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { myFunction } from './my-module';

describe('myFunction', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should handle valid input', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction('')).toThrow('Invalid input');
  });
});
```

## Package Management

**CRITICAL**: Use consistent package manager across team.

- **Default**: npm (most compatible, built-in)
- **Alternative**: pnpm (fast, disk-efficient) or yarn
- **Lockfile**: Always commit lockfile (`package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`)
- **Workspaces**: Use for monorepos
- **CI/CD**: Update GitHub Actions workflows to match your package manager (see workflow comments)

### Dependencies

1. **Check for latest versions**:
   - Use Context7 MCP tool if available
   - Check npm registry: `npm view <package> versions`
   - Review changelog for breaking changes

2. **Dependency Guidelines**:
   - ✅ Use exact versions for applications (`"1.2.3"`)
   - ✅ Use semver for libraries (`"^1.2.3"`)
   - ✅ Keep dependencies updated regularly
   - ✅ Use `npm audit` or `pnpm audit` for security
   - ❌ Don't use deprecated packages
   - ❌ Don't add unnecessary dependencies

3. **Document new dependencies**:
   - Update CHANGELOG.md
   - Document why dependency was added
   - Note any peer dependencies

## Type Safety

- **No `any`**: Avoid `any` type - use `unknown` and type guards
- **Strict null checks**: Handle null/undefined explicitly
- **Type assertions**: Minimize use of `as` - prefer type guards
- **Generics**: Use for reusable type-safe code

Example type-safe code:
```typescript
// Good: Type guard
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function process(input: unknown): string {
  if (isString(input)) {
    return input.toUpperCase();
  }
  throw new Error('Invalid input');
}

// Bad: Type assertion
function processUnsafe(input: unknown): string {
  return (input as string).toUpperCase(); // Runtime error if not string
}
```

## Error Handling

- Create custom error classes
- Use type guards for error checking
- Document errors in JSDoc/TSDoc
- Never swallow errors silently

Example:
```typescript
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validate(data: unknown): Data {
  if (!isValidData(data)) {
    throw new ValidationError('Invalid data structure', 'data');
  }
  return data;
}
```

## Documentation

- **JSDoc/TSDoc**: Document public APIs
- **Examples**: Include usage examples
- **Type exports**: Export types for library consumers
- **README**: Include API documentation

Example:
```typescript
/**
 * Processes the input data and returns a formatted result.
 *
 * @param input - The input string to process
 * @param options - Optional processing options
 * @returns The processed string in uppercase
 * @throws {ValidationError} If input is empty
 *
 * @example
 * ```typescript
 * const result = process('hello', { trim: true });
 * console.log(result); // 'HELLO'
 * ```
 */
export function process(
  input: string,
  options?: ProcessOptions
): string {
  // Implementation
}
```

## Project Structure

```
project/
├── package.json        # Package manifest
├── tsconfig.json       # TypeScript config
├── vitest.config.ts    # Test config
├── README.md           # Project overview (allowed in root)
├── CHANGELOG.md        # Version history (allowed in root)
├── AGENTS.md          # AI assistant rules (allowed in root)
├── LICENSE            # Project license (allowed in root)
├── CONTRIBUTING.md    # Contribution guidelines (allowed in root)
├── CODE_OF_CONDUCT.md # Code of conduct (allowed in root)
├── SECURITY.md        # Security policy (allowed in root)
├── src/
│   ├── index.ts        # Main entry point
│   ├── types.ts        # Type definitions
│   └── ...
├── tests/              # Test files
├── dist/               # Compiled output (gitignored)
└── docs/               # Project documentation
```

## Module System

- Use ES modules (`import`/`export`)
- Set `"type": "module"` in `package.json`
- Use `.js` extensions in imports for Node.js compatibility
- Configure `moduleResolution: "node"` in tsconfig.json

Example:
```typescript
// Good: ES modules with .js extension
import { myFunction } from './my-module.js';

export { myFunction };
export default class MyClass {}
```

## CI/CD Requirements

**CRITICAL**: GitHub Actions `cache: 'npm'` requires `package-lock.json` to be committed.

- **Lockfile Requirement**: Remove `package-lock.json` from `.gitignore`
- **Cache Strategy**: Use `cache: 'npm'` in `setup-node` action
- **Install Command**: Use `npm ci` (not `npm install`) for reproducible builds
- **Error Prevention**: Without committed lockfile, you'll get:
  ```
  Error: Dependencies lock file is not found in repository
  Supported file patterns: package-lock.json,npm-shrinkwrap.json,yarn.lock
  ```

Must include GitHub Actions workflows for:

1. **Testing** (`typescript-test.yml`):
   - Test on ubuntu-latest, windows-latest, macos-latest
   - Use Vitest for fast execution
   - Upload coverage reports
   - **MUST**: Commit package-lock.json for caching

2. **Linting** (`typescript-lint.yml`):
   - Type check: `tsc --noEmit`
   - ESLint: `eslint src/**/*.ts`
   - Prettier: `prettier --check "src/**/*.ts"`
   - **MUST**: Commit package-lock.json for caching

3. **Build** (`typescript-build.yml`):
   - Build: `npm run build`
   - Verify no type errors
   - Check output artifacts
   - **MUST**: Commit package-lock.json for caching

## Package Publication

### Publishing to npm

**Prerequisites:**
1. Create npm account at https://www.npmjs.com
2. Generate npm token (Account Settings → Access Tokens → Generate New Token)
3. Add `NPM_TOKEN` to GitHub repository secrets

**package.json Configuration:**

```json
{
  "name": "@your-org/package-name",
  "version": "1.0.0",
  "description": "Package description",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": ["your", "keywords"],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/package-name"
  }
}
```

**Publishing Workflow:**

1. Update version: `npm version patch|minor|major`
2. Create release tag: `git push --tags`
3. GitHub Actions automatically publishes to npm
4. Or manual publish: `npm publish --access public`

**Publishing Checklist:**

- ✅ All tests passing
- ✅ Code linted and formatted
- ✅ Version updated in package.json
- ✅ CHANGELOG.md updated
- ✅ README.md up to date
- ✅ Type declarations generated
- ✅ Package size reasonable (`npm pack` to check)
- ✅ .npmignore or package.json "files" configured
- ✅ Provenance enabled for security

**npm Provenance:**

Enable provenance for better security and transparency:
```bash
npm publish --provenance --access public
```

This links your package to its source code and build process.

<!-- TYPESCRIPT:END -->

