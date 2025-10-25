import { describe, it, expect, beforeEach } from 'vitest';
import { createOpenSpecManager } from '../dist/core/openspec-manager.js';
import { createLogger } from '../dist/core/logger.js';
import { createCLIBridge } from '../dist/core/cli-bridge.js';
import { createConfigManager } from '../dist/core/config-manager.js';

describe('Performance Optimization', () => {
  let openspecManager: ReturnType<typeof createOpenSpecManager>;
  let logger: ReturnType<typeof createLogger>;
  let cliBridge: ReturnType<typeof createCLIBridge>;
  let configManager: ReturnType<typeof createConfigManager>;

  beforeEach(async () => {
    const projectRoot = process.cwd() || '/mnt/f/Node/hivellm/rulebook';
    logger = createLogger(projectRoot);
    configManager = createConfigManager(projectRoot);
    const config = await configManager.loadConfig();
    cliBridge = createCLIBridge(logger, config);
    openspecManager = createOpenSpecManager(projectRoot);
    await openspecManager.initialize();
  });

  it('should load tasks efficiently', async () => {
    const startTime = Date.now();

    const tasks = await openspecManager.getTasksByPriority();

    const loadTime = Date.now() - startTime;

    expect(tasks).toBeDefined();
    expect(Array.isArray(tasks)).toBe(true);
    expect(loadTime).toBeLessThan(1000); // Should load in less than 1 second

    console.log(`Task loading performance: ${loadTime}ms for ${tasks.length} tasks`);
  });

  it('should handle concurrent task operations', async () => {
    const startTime = Date.now();

    // Run multiple operations concurrently
    const [tasks, stats, nextTask] = await Promise.all([
      openspecManager.getTasksByPriority(),
      openspecManager.getTaskStats(),
      openspecManager.getNextTask(),
    ]);

    const concurrentTime = Date.now() - startTime;

    expect(tasks).toBeDefined();
    expect(stats).toBeDefined();
    expect(concurrentTime).toBeLessThan(2000); // Should complete in less than 2 seconds

    console.log(`Concurrent operations performance: ${concurrentTime}ms`);
  });

  it('should detect CLI tools efficiently', async () => {
    const startTime = Date.now();

    const tools = await cliBridge.detectCLITools();

    const detectionTime = Date.now() - startTime;

    expect(tools).toBeDefined();
    expect(Array.isArray(tools)).toBe(true);
    expect(detectionTime).toBeLessThan(5000); // Should detect in less than 5 seconds

    console.log(`CLI detection performance: ${detectionTime}ms for ${tools.length} tools`);
  });

  it('should handle memory efficiently', async () => {
    const initialMemory = process.memoryUsage();

    // Perform multiple operations to test memory usage
    for (let i = 0; i < 10; i++) {
      await openspecManager.getTasksByPriority();
      await openspecManager.getTaskStats();
    }

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

    console.log(`Memory usage: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase`);
  });

  it('should optimize CLI command execution', async () => {
    const startTime = Date.now();

    // Test a simple CLI command with timeout
    const response = await cliBridge.sendCommandToCLI('cursor-agent', 'Test performance', {
      timeout: 10000, // 10 second timeout
    });

    const executionTime = Date.now() - startTime;

    expect(response).toBeDefined();
    expect(typeof response.success).toBe('boolean');
    expect(executionTime).toBeLessThan(15000); // Should complete within timeout + buffer

    console.log(`CLI execution performance: ${executionTime}ms, success: ${response.success}`);
  });

  it('should handle large task datasets efficiently', async () => {
    const startTime = Date.now();

    // Simulate processing multiple task operations
    const operations = [];
    for (let i = 0; i < 5; i++) {
      operations.push(openspecManager.getTasksByPriority());
      operations.push(openspecManager.getTaskStats());
    }

    const results = await Promise.all(operations);

    const processingTime = Date.now() - startTime;

    expect(results.length).toBe(10); // 5 tasks + 5 stats
    expect(processingTime).toBeLessThan(3000); // Should process efficiently

    console.log(`Large dataset processing: ${processingTime}ms for ${results.length} operations`);
  });

  it('should optimize logger performance', async () => {
    const startTime = Date.now();

    // Test logger performance with multiple log entries
    for (let i = 0; i < 100; i++) {
      logger.info(`Performance test log entry ${i}`);
    }

    const loggingTime = Date.now() - startTime;

    expect(loggingTime).toBeLessThan(1000); // Should log 100 entries in less than 1 second

    console.log(`Logger performance: ${loggingTime}ms for 100 log entries`);
  });

  it('should handle configuration loading efficiently', async () => {
    const startTime = Date.now();

    // Test multiple config loads
    const configs = await Promise.all([
      configManager.loadConfig(),
      configManager.loadConfig(),
      configManager.loadConfig(),
    ]);

    const configTime = Date.now() - startTime;

    expect(configs.length).toBe(3);
    expect(configTime).toBeLessThan(500); // Should load configs quickly

    console.log(`Config loading performance: ${configTime}ms for 3 loads`);
  });
});
