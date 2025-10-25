#!/usr/bin/env node

/**
 * Simple Agent Manager Test Command
 * 
 * This script provides a simple way to test the agent manager functionality
 * without complex test frameworks.
 */

import { execa } from 'execa';
import chalk from 'chalk';
import ora from 'ora';

async function testAgentManager() {
  console.log(chalk.bold.blue('\n🤖 Testing Agent Manager\n'));
  
  const tests = [
    {
      name: 'Build Project',
      command: 'npm run build',
      description: 'Building TypeScript project'
    },
    {
      name: 'Type Check',
      command: 'npm run type-check',
      description: 'Running TypeScript type checking'
    },
    {
      name: 'Lint Check',
      command: 'npm run lint',
      description: 'Running ESLint checks'
    },
    {
      name: 'Format Check',
      command: 'npm run format',
      description: 'Running Prettier formatting'
    },
    {
      name: 'Run Tests',
      command: 'npm test',
      description: 'Running all tests'
    },
    {
      name: 'Coverage Check',
      command: 'npm run test:coverage',
      description: 'Running tests with coverage'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const spinner = ora(test.description).start();
    
    try {
      const result = await execa('bash', ['-c', test.command], {
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 60000 // 60 second timeout
      });
      
      spinner.succeed(chalk.green(`✅ ${test.name} passed`));
      passed++;
      
      if (result.stdout && test.name === 'Coverage Check') {
        // Extract coverage percentage from output
        const coverageMatch = result.stdout.match(/(\d+\.?\d*)%/);
        if (coverageMatch) {
          const coverage = parseFloat(coverageMatch[1]);
          if (coverage >= 95) {
            console.log(chalk.green(`   Coverage: ${coverage}% ✅`));
          } else {
            console.log(chalk.yellow(`   Coverage: ${coverage}% ⚠️`));
          }
        }
      }
      
    } catch (error) {
      spinner.fail(chalk.red(`❌ ${test.name} failed`));
      failed++;
      
      if (error.stdout) {
        console.log(chalk.gray('   Output:'), error.stdout.slice(0, 200) + '...');
      }
      
      if (error.stderr) {
        console.log(chalk.gray('   Error:'), error.stderr.slice(0, 200) + '...');
      }
    }
  }

  console.log(chalk.bold('\n📊 Test Summary:'));
  console.log(chalk.green(`✅ Passed: ${passed}`));
  console.log(chalk.red(`❌ Failed: ${failed}`));
  
  if (failed === 0) {
    console.log(chalk.bold.green('\n🎉 All tests passed! Agent Manager is ready to use.'));
  } else {
    console.log(chalk.bold.red('\n⚠️ Some tests failed. Please fix the issues before using Agent Manager.'));
    process.exit(1);
  }
}

async function testCLITools() {
  console.log(chalk.bold.blue('\n🔧 Testing CLI Tools Detection\n'));
  
  const cliTools = [
    'cursor-agent',
    'cursor-cli', 
    'gemini-cli',
    'claude-cli'
  ];

  for (const tool of cliTools) {
    const spinner = ora(`Checking ${tool}...`).start();
    
    try {
      const result = await execa(tool, ['--version'], {
        stdio: 'pipe',
        timeout: 5000,
        reject: false
      });
      
      if (result.exitCode === 0) {
        spinner.succeed(chalk.green(`✅ ${tool} available - ${result.stdout.trim()}`));
      } else {
        spinner.info(chalk.yellow(`ℹ️ ${tool} not available`));
      }
    } catch (error) {
      spinner.info(chalk.yellow(`ℹ️ ${tool} not available`));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(chalk.bold.blue('\n🤖 Agent Manager Test Command\n'));
    console.log(chalk.white('Usage: node scripts/test-agent-simple.js [options]\n'));
    console.log(chalk.bold('Options:'));
    console.log(chalk.gray('  --cli-tools    Test CLI tools detection only'));
    console.log(chalk.gray('  --help, -h     Show this help message\n'));
    return;
  }
  
  if (args.includes('--cli-tools')) {
    await testCLITools();
    return;
  }
  
  // Run all tests
  await testAgentManager();
  await testCLITools();
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n❌ Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('\n❌ Unhandled Rejection:'), reason);
  process.exit(1);
});

main().catch(error => {
  console.error(chalk.red('\n❌ Script Error:'), error.message);
  process.exit(1);
});