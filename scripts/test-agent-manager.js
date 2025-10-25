#!/usr/bin/env node

/**
 * Agent Manager Test Runner
 * 
 * This script provides a comprehensive test command for the agent manager
 * functionality, including CLI tool detection, workflow execution, and error handling.
 */

import { execa } from 'execa';
import chalk from 'chalk';
import ora from 'ora';

const TEST_COMMANDS = {
  // Basic functionality tests
  'detect-tools': {
    description: 'Test CLI tool detection',
    command: 'npx vitest run tests/agent-manager-comprehensive.test.ts -t "CLI Tool Detection"'
  },
  
  'test-initialization': {
    description: 'Test agent manager initialization',
    command: 'npx vitest run tests/agent-manager-comprehensive.test.ts -t "Initialization"'
  },
  
  'test-workflow': {
    description: 'Test workflow execution',
    command: 'npx vitest run tests/agent-manager-comprehensive.test.ts -t "Agent Workflow Execution"'
  },
  
  'test-quality-checks': {
    description: 'Test quality checks (lint, format)',
    command: 'npx vitest run tests/agent-manager-comprehensive.test.ts -t "Quality Checks"'
  },
  
  'test-error-handling': {
    description: 'Test error handling and recovery',
    command: 'npx vitest run tests/agent-manager-comprehensive.test.ts -t "Error Handling"'
  },
  
  // Integration tests
  'test-integration': {
    description: 'Test full integration workflow',
    command: 'npx vitest run tests/agent-manager-comprehensive.test.ts -t "Integration Tests"'
  },
  
  // All tests
  'all': {
    description: 'Run all agent manager tests',
    command: 'npx vitest run tests/agent-manager-comprehensive.test.ts'
  },
  
  // Coverage tests
  'coverage': {
    description: 'Run tests with coverage report',
    command: 'npx vitest run tests/agent-manager-comprehensive.test.ts --coverage'
  },
  
  // Watch mode
  'watch': {
    description: 'Run tests in watch mode',
    command: 'npx vitest tests/agent-manager-comprehensive.test.ts --watch'
  }
};

async function runTest(testName) {
  const testConfig = TEST_COMMANDS[testName];
  
  if (!testConfig) {
    console.error(chalk.red(`❌ Unknown test: ${testName}`));
    console.log(chalk.yellow('Available tests:'));
    Object.keys(TEST_COMMANDS).forEach(key => {
      console.log(chalk.gray(`  ${key.padEnd(20)} - ${TEST_COMMANDS[key].description}`));
    });
    process.exit(1);
  }

  const spinner = ora(`Running ${testName} test...`).start();
  
  try {
    const result = await execa('bash', ['-c', testConfig.command], {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    spinner.succeed(chalk.green(`✅ ${testName} test completed successfully`));
    
    if (result.stdout) {
      console.log(chalk.gray('\nTest Output:'));
      console.log(result.stdout);
    }
    
    if (result.stderr) {
      console.log(chalk.yellow('\nTest Warnings:'));
      console.log(result.stderr);
    }
    
  } catch (error) {
    spinner.fail(chalk.red(`❌ ${testName} test failed`));
    
    if (error.stdout) {
      console.log(chalk.red('\nTest Output:'));
      console.log(error.stdout);
    }
    
    if (error.stderr) {
      console.log(chalk.red('\nTest Errors:'));
      console.log(error.stderr);
    }
    
    process.exit(1);
  }
}

async function showHelp() {
  console.log(chalk.bold.blue('\n🤖 Agent Manager Test Runner\n'));
  console.log(chalk.white('Usage: node scripts/test-agent-manager.js <test-name>\n'));
  
  console.log(chalk.bold('Available Tests:\n'));
  
  Object.entries(TEST_COMMANDS).forEach(([key, config]) => {
    console.log(chalk.green(`  ${key.padEnd(20)}`), chalk.gray(config.description));
  });
  
  console.log(chalk.gray('\nExamples:'));
  console.log(chalk.gray('  node scripts/test-agent-manager.js detect-tools'));
  console.log(chalk.gray('  node scripts/test-agent-manager.js all'));
  console.log(chalk.gray('  node scripts/test-agent-manager.js coverage'));
  console.log(chalk.gray('  node scripts/test-agent-manager.js watch\n'));
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    await showHelp();
    return;
  }
  
  const testName = args[0];
  
  console.log(chalk.bold.blue('\n🚀 Starting Agent Manager Tests\n'));
  
  // Check if we're in the right directory
  try {
    const packageJson = await import('./package.json', { assert: { type: 'json' } });
    if (packageJson.default.name !== '@hivellm/rulebook') {
      console.error(chalk.red('❌ Please run this script from the rulebook project root'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('❌ Could not verify project directory'));
    process.exit(1);
  }
  
  // Run the test
  await runTest(testName);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n❌ Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('\n❌ Unhandled Rejection:'), reason);
  process.exit(1);
});

// Run main function
main().catch(error => {
  console.error(chalk.red('\n❌ Script Error:'), error.message);
  process.exit(1);
});