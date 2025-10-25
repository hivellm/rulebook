#!/usr/bin/env node

import { execa } from 'execa';
import chalk from 'chalk';
import ora from 'ora';

// Test configuration
const TESTS = [
  {
    name: 'Type Check',
    command: 'npx tsc --noEmit',
    description: 'Running TypeScript type checking',
    critical: true
  },
  {
    name: 'Build',
    command: 'npx tsc',
    description: 'Building the project',
    critical: true
  },
  {
    name: 'Lint',
    command: 'npx eslint src/**/*.ts',
    description: 'Running ESLint',
    critical: false
  },
  {
    name: 'Format Check',
    command: 'npx prettier --check "src/**/*.ts" "tests/**/*.ts"',
    description: 'Checking code formatting',
    critical: false
  },
  {
    name: 'Agent Manager Tests',
    command: 'npx vitest run tests/agent-manager-comprehensive.test.ts',
    description: 'Running comprehensive agent manager tests',
    critical: true
  },
  {
    name: 'Agent CLI Tests',
    command: 'npx vitest run tests/agent-manager-cli.test.ts',
    description: 'Running agent CLI integration tests',
    critical: true
  }
];

async function runTest(test) {
  const spinner = ora(test.description).start();
  
  try {
    const result = await execa('bash', ['-c', test.command], {
      cwd: process.cwd(),
      stdio: 'pipe',
      timeout: 120000 // 2 minutes timeout
    });
    
    spinner.succeed(chalk.green(`✅ ${test.name} passed`));
    return { success: true, output: result.stdout, test };
  } catch (error) {
    const isCritical = test.critical;
    const icon = isCritical ? '❌' : '⚠️';
    const color = isCritical ? chalk.red : chalk.yellow;
    
    spinner[isCritical ? 'fail' : 'warn'](color(`${icon} ${test.name} ${isCritical ? 'failed' : 'has issues'}`));
    
    if (error.stdout) {
      console.log(chalk.gray('STDOUT:'), error.stdout);
    }
    if (error.stderr) {
      console.log(chalk.gray('STDERR:'), error.stderr);
    }
    
    return { success: !isCritical, error: error.message, test };
  }
}

async function testAgentManager() {
  console.log(chalk.bold.blue('\n🤖 Agent Manager Test Suite\n'));
  console.log(chalk.gray('Testing agent manager functionality and CLI integration\n'));

  const results = [];
  let criticalFailures = 0;
  
  for (const test of TESTS) {
    const result = await runTest(test);
    results.push(result);
    
    if (!result.success && test.critical) {
      criticalFailures++;
    }
    
    // Add small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log(chalk.bold.blue('\n📊 Test Summary\n'));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const warnings = results.filter(r => !r.success && !r.test.critical).length;
  
  console.log(chalk.green(`✅ Passed: ${passed}`));
  if (warnings > 0) {
    console.log(chalk.yellow(`⚠️  Warnings: ${warnings}`));
  }
  if (criticalFailures > 0) {
    console.log(chalk.red(`❌ Critical Failures: ${criticalFailures}`));
  }
  
  console.log(chalk.gray(`Total: ${results.length}`));
  
  // Show failed tests
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log(chalk.bold.red('\n❌ Failed Tests:\n'));
    failedTests.forEach(result => {
      const icon = result.test.critical ? '❌' : '⚠️';
      const color = result.test.critical ? chalk.red : chalk.yellow;
      console.log(color(`${icon} ${result.test.name}`));
      if (result.error) {
        console.log(chalk.gray(`   ${result.error}`));
      }
    });
  }
  
  if (criticalFailures > 0) {
    console.log(chalk.bold.red('\n❌ Critical tests failed. Please fix before proceeding.'));
    process.exit(1);
  } else if (failed > 0) {
    console.log(chalk.bold.yellow('\n⚠️  Some tests have warnings. Please review.'));
    process.exit(0);
  } else {
    console.log(chalk.bold.green('\n🎉 All tests passed!'));
    process.exit(0);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(chalk.bold.blue('Agent Manager Test Suite\n'));
  console.log('Usage: node test-agent-manager.js [options]\n');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --quick        Run only critical tests');
  console.log('  --verbose      Show detailed output');
  console.log('\nAvailable tests:');
  TESTS.forEach(test => {
    const icon = test.critical ? '🔴' : '🟡';
    console.log(`  ${icon} ${test.name}: ${test.description}`);
  });
  process.exit(0);
}

if (args.includes('--quick')) {
  // Run only critical tests
  const quickTests = TESTS.filter(test => test.critical);
  TESTS.splice(0, TESTS.length, ...quickTests);
  console.log(chalk.yellow('Running quick test suite (critical tests only)\n'));
}

if (args.includes('--verbose')) {
  // Enable verbose output
  process.env.VITEST_UI = 'true';
}

testAgentManager().catch(error => {
  console.error(chalk.red('Test runner failed:'), error);
  process.exit(1);
});