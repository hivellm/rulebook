#!/usr/bin/env node

// Simple test for agent manager functionality using ES modules
console.log('🤖 Testing Agent Manager (ES Modules)...\n');

// Test 1: Check if we can import the agent manager
console.log('1. Testing agent manager import...');
try {
  const { createAgentManager } = await import('./dist/core/agent-manager.js');
  console.log('✅ Agent manager imported successfully');
} catch (error) {
  console.log('❌ Failed to import agent manager:', error.message);
  process.exit(1);
}

// Test 2: Check if we can import CLI bridge
console.log('2. Testing CLI bridge import...');
try {
  const { createCLIBridge } = await import('./dist/core/cli-bridge.js');
  console.log('✅ CLI bridge imported successfully');
} catch (error) {
  console.log('❌ Failed to import CLI bridge:', error.message);
  process.exit(1);
}

// Test 3: Check if we can import logger
console.log('3. Testing logger import...');
try {
  const { createLogger } = await import('./dist/core/logger.js');
  console.log('✅ Logger imported successfully');
} catch (error) {
  console.log('❌ Failed to import logger:', error.message);
  process.exit(1);
}

// Test 4: Check if we can import config manager
console.log('4. Testing config manager import...');
try {
  const { createConfigManager } = await import('./dist/core/config-manager.js');
  console.log('✅ Config manager imported successfully');
} catch (error) {
  console.log('❌ Failed to import config manager:', error.message);
  process.exit(1);
}

// Test 5: Test basic functionality
console.log('5. Testing basic functionality...');
try {
  const { createAgentManager } = await import('./dist/core/agent-manager.js');
  const { createCLIBridge } = await import('./dist/core/cli-bridge.js');
  const { createLogger } = await import('./dist/core/logger.js');
  const { createConfigManager } = await import('./dist/core/config-manager.js');
  
  const logger = createLogger(process.cwd());
  const configManager = createConfigManager(process.cwd());
  const config = await configManager.loadConfig();
  const cliBridge = createCLIBridge(logger, config);
  const agentManager = createAgentManager(process.cwd());
  
  console.log('✅ Basic functionality test passed');
} catch (error) {
  console.log('❌ Basic functionality test failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 All ES module tests passed!');
console.log('\nTo run comprehensive tests, use:');
console.log('  npm run test:agent:full');
console.log('  npm run test:agent:quick');
console.log('  npm test tests/agent-manager-comprehensive.test.ts');
console.log('\nTo run the PowerShell test script:');
console.log('  powershell -ExecutionPolicy Bypass -File test-agent.ps1 -Quick');