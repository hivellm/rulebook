# Agent Manager Test Commands

This document provides comprehensive test commands for the Agent Manager functionality in the Rulebook project.

## Available Test Commands

### 1. Basic Test Command
```bash
npm run test:agent
```
Runs basic tests including:
- Project directory check
- Node.js version check
- TypeScript availability
- npm availability
- Vitest availability
- CLI tools detection
- Build output check

### 2. Quick Test Command
```bash
npm run test:agent:quick
```
Runs the same basic tests as above.

### 3. Comprehensive Test Suite
```bash
npm run test:agent:comprehensive
```
Runs the full comprehensive test suite using Vitest, including:
- Agent Manager initialization tests
- CLI tool detection and selection tests
- Workflow execution tests
- Quality checks (lint, format) tests
- Error handling and recovery tests
- Integration tests

### 4. Full Test Suite
```bash
npm run test:agent:full
```
Runs all agent manager tests including comprehensive test suite.

## Manual Test Commands

### 1. Build the Project
```bash
npm run build
```
Compiles TypeScript source code to JavaScript in the `dist/` directory.

### 2. Type Check
```bash
npm run type-check
```
Runs TypeScript type checking without emitting files.

### 3. Lint Check
```bash
npm run lint
```
Runs ESLint to check code quality and style.

### 4. Format Check
```bash
npm run format
```
Runs Prettier to format code according to project standards.

### 5. Run All Tests
```bash
npm test
```
Runs all unit tests using Vitest.

### 6. Coverage Check
```bash
npm run test:coverage
```
Runs tests with coverage analysis to ensure 95%+ coverage.

## CLI Tools Testing

### Test CLI Tools Detection
```bash
# Check if cursor-agent is available
cursor-agent --version

# Check if cursor-cli is available
cursor-cli --version

# Check if gemini-cli is available
gemini-cli --version

# Check if claude-cli is available
claude-cli --version
```

### Test Agent Manager CLI Integration
```bash
# Test agent manager help
npm run agent -- --help

# Test agent manager in dry-run mode
npm run agent -- --dry-run

# Test agent manager with specific tool
npm run agent -- --tool cursor-agent

# Test agent manager with custom iterations
npm run agent -- --iterations 5

# Test agent manager in watch mode
npm run agent -- --watch
```

## Test Files Created

1. **`tests/agent-manager-comprehensive.test.ts`** - Comprehensive test suite using Vitest
2. **`scripts/test-agent-simple.mjs`** - Simple test command using ES modules
3. **`test-agent-command.js`** - Advanced test command with multiple options
4. **`test-agent-manager.sh`** - Bash script for comprehensive testing
5. **`test-agent.js`** - Simple CommonJS test command

## Test Coverage

The comprehensive test suite covers:

### Core Functionality
- ✅ Agent Manager initialization
- ✅ CLI tool detection and selection
- ✅ Task workflow execution
- ✅ Quality checks (lint, format)
- ✅ Test execution
- ✅ Coverage checking
- ✅ Error handling and recovery

### Integration Tests
- ✅ Full agent workflow
- ✅ CLI health checks
- ✅ CLI capabilities detection
- ✅ Module imports and exports

### Error Scenarios
- ✅ Initialization failures
- ✅ CLI command timeouts
- ✅ Task execution failures
- ✅ Test failures
- ✅ Coverage threshold failures

### Agent Options
- ✅ Dry run mode
- ✅ Watch mode
- ✅ Custom max iterations
- ✅ Preferred tool selection

## Running Tests

### Quick Start
```bash
# Run basic tests
npm run test:agent

# Run comprehensive tests
npm run test:agent:comprehensive

# Run all tests
npm run test:agent:full
```

### Development Testing
```bash
# Build first
npm run build

# Run type check
npm run type-check

# Run lint
npm run lint

# Run format
npm run format

# Run tests
npm test

# Check coverage
npm run test:coverage
```

### Agent Manager Testing
```bash
# Test agent help
npm run agent -- --help

# Test dry run
npm run agent -- --dry-run

# Test with specific tool
npm run agent -- --tool cursor-agent --iterations 3
```

## Troubleshooting

### Common Issues

1. **"Please run from rulebook project root"**
   - Make sure you're in the project root directory
   - Check that `package.json` and `src/core/agent-manager.ts` exist

2. **"TypeScript not available"**
   - Run `npm install` to install dependencies
   - Check that TypeScript is in devDependencies

3. **"No CLI tools detected"**
   - Install one of: cursor-agent, cursor-cli, gemini-cli, or claude-cli
   - Make sure the tool is in your PATH

4. **"Agent manager not built yet"**
   - Run `npm run build` to compile TypeScript
   - Check that `dist/core/agent-manager.js` exists

5. **"Tests failed"**
   - Check the error output for specific issues
   - Run `npm run type-check` to check for TypeScript errors
   - Run `npm run lint` to check for linting issues
   - Run `npm run format` to fix formatting issues

### Debug Mode

To run tests with more verbose output:

```bash
# Run with debug output
DEBUG=* npm run test:agent

# Run vitest with verbose output
npx vitest run --reporter=verbose

# Run with coverage and verbose output
npx vitest run --coverage --reporter=verbose
```

## Success Criteria

The agent manager is considered ready when:

1. ✅ All basic tests pass
2. ✅ TypeScript compilation succeeds
3. ✅ Lint checks pass with no warnings
4. ✅ Code formatting is consistent
5. ✅ Unit tests pass with 95%+ coverage
6. ✅ At least one CLI tool is detected
7. ✅ Agent manager can be imported successfully
8. ✅ Agent manager can initialize without errors

## Next Steps

After running tests successfully:

1. **Test Agent Functionality**
   ```bash
   npm run agent -- --dry-run
   ```

2. **Test with Real Tasks**
   ```bash
   npm run agent -- --tool cursor-agent --iterations 1
   ```

3. **Monitor Agent Performance**
   ```bash
   npm run agent -- --watch
   ```

4. **Check Agent Health**
   ```bash
   npm run agent -- --help
   ```