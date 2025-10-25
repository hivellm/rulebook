#!/usr/bin/env node

// Simple test script for agent manager
console.log('🤖 Testing Agent Manager...\n');

// Test 1: Check if we can import the agent manager
try {
  console.log('1. Testing agent manager import...');
  const { createAgentManager } = require('./dist/core/agent-manager.js');
  console.log('✅ Agent manager imported successfully\n');
} catch (error) {
  console.log('❌ Failed to import agent manager:', error.message);
  process.exit(1);
}

// Test 2: Check if we can import CLI bridge
try {
  console.log('2. Testing CLI bridge import...');
  const { createCLIBridge } = require('./dist/core/cli-bridge.js');
  console.log('✅ CLI bridge imported successfully\n');
} catch (error) {
  console.log('❌ Failed to import CLI bridge:', error.message);
  process.exit(1);
}

// Test 3: Check if we can import logger
try {
  console.log('3. Testing logger import...');
  const { createLogger } = require('./dist/core/logger.js');
  console.log('✅ Logger imported successfully\n');
} catch (error) {
  console.log('❌ Failed to import logger:', error.message);
  process.exit(1);
}

// Test 4: Check if we can import config manager
try {
  console.log('4. Testing config manager import...');
  const { createConfigManager } = require('./dist/core/config-manager.js');
  console.log('✅ Config manager imported successfully\n');
} catch (error) {
  console.log('❌ Failed to import config manager:', error.message);
  process.exit(1);
}

console.log('🎉 All basic imports successful!');
console.log('\nTo run full tests, use:');
console.log('  npm run test:agent:full');
console.log('  npm run test:agent:quick');
console.log('  npm test tests/agent-manager-comprehensive.test.ts');