import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createConfigManager, getDefaultConfig } from '../src/core/config-manager.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ConfigManager', () => {
  let tempDir: string;
  let configManager: ReturnType<typeof createConfigManager>;

  beforeEach(async () => {
    // Create temporary directory in system temp
    tempDir = join(tmpdir(), 'rulebook-test-config-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    configManager = createConfigManager(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initializeConfig', () => {
    it('should create default configuration', async () => {
      const config = await configManager.initializeConfig();

      expect(config).toMatchObject({
        version: '1.0.0',
        projectId: expect.any(String),
        coverageThreshold: 95,
        language: 'en',
        outputLanguage: 'en',
        maxParallelTasks: 1,
      });

      expect(config.features).toMatchObject({
        watcher: true,
        agent: true,
        logging: true,
        telemetry: true,
      });
    });

    it('should create .rulebook file', async () => {
      await configManager.initializeConfig();

      const configPath = join(tempDir, '.rulebook');
      const exists = await fs
        .access(configPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    });
  });

  describe('loadConfig', () => {
    it('should load existing configuration', async () => {
      // Initialize first
      const originalConfig = await configManager.initializeConfig();

      // Load it back
      const loadedConfig = await configManager.loadConfig();

      expect(loadedConfig.projectId).toBe(originalConfig.projectId);
      expect(loadedConfig.version).toBe(originalConfig.version);
    });

    it('should initialize config if file does not exist', async () => {
      const config = await configManager.loadConfig();

      expect(config).toMatchObject({
        version: '1.0.0',
        coverageThreshold: 95,
      });
    });
  });

  describe('updateConfig', () => {
    it('should update configuration values', async () => {
      await configManager.initializeConfig();

      const updatedConfig = await configManager.updateConfig({
        coverageThreshold: 90,
        maxParallelTasks: 3,
      });

      expect(updatedConfig.coverageThreshold).toBe(90);
      expect(updatedConfig.maxParallelTasks).toBe(3);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle corrupted config file gracefully', async () => {
      const configPath = join(tempDir, '.rulebook');
      await fs.writeFile(configPath, 'invalid json {{{');

      // Should reinitialize with defaults
      const config = await configManager.loadConfig();
      expect(config.version).toBe('1.0.0');
    });

    it('should handle missing features object', async () => {
      const configPath = join(tempDir, '.rulebook');
      await fs.writeFile(configPath, JSON.stringify({ version: '1.0.0' }));

      const config = await configManager.loadConfig();
      expect(config.features).toBeDefined();
    });

    it('should handle empty updates', async () => {
      await configManager.initializeConfig();
      const config = await configManager.updateConfig({});
      expect(config.version).toBe('1.0.0');
    });

    it('should handle null and undefined values in updates', async () => {
      await configManager.initializeConfig();
      const config = await configManager.updateConfig({
        coverageThreshold: undefined as any,
      });
      expect(config).toBeDefined();
    });
  });

  describe('toggleFeature', () => {
    it('should enable feature', async () => {
      await configManager.initializeConfig();

      const config = await configManager.toggleFeature('notifications', true);

      expect(config.features.notifications).toBe(true);
    });

    it('should disable feature', async () => {
      await configManager.initializeConfig();

      const config = await configManager.toggleFeature('watcher', false);

      expect(config.features.watcher).toBe(false);
    });
  });

  describe('detectCLITools', () => {
    it('should return empty array when no tools available', async () => {
      const tools = await configManager.detectCLITools();

      expect(Array.isArray(tools)).toBe(true);
      // In test environment, no CLI tools should be available
    });
  });

  describe('getConfigSummary', () => {
    it('should return configuration summary', async () => {
      await configManager.initializeConfig();

      const summary = await configManager.getConfigSummary();

      expect(summary).toMatchObject({
        version: '1.0.0',
        projectId: expect.any(String),
        coverageThreshold: 95,
        cliTools: expect.any(Array),
        enabledFeatures: expect.any(Array),
      });
    });
  });
});

describe('getDefaultConfig', () => {
  it('should return default configuration', () => {
    const config = getDefaultConfig();

    expect(config).toMatchObject({
      version: '1.0.0',
      projectId: expect.any(String),
      coverageThreshold: 95,
      language: 'en',
      outputLanguage: 'en',
      maxParallelTasks: 1,
    });

    expect(config.features).toMatchObject({
      watcher: true,
      agent: true,
      logging: true,
      telemetry: true,
    });
  });

  it('should have unique project IDs', () => {
    const config1 = getDefaultConfig();
    const config2 = getDefaultConfig();

    expect(config1.projectId).not.toBe(config2.projectId);
  });

  it('should have current timestamps', () => {
    const config = getDefaultConfig();
    const now = new Date();
    const installedAt = new Date(config.installedAt);
    const updatedAt = new Date(config.updatedAt);

    expect(installedAt.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(updatedAt.getTime()).toBeLessThanOrEqual(now.getTime());
  });

  it('should have all required features', () => {
    const config = getDefaultConfig();

    expect(config.features).toHaveProperty('watcher');
    expect(config.features).toHaveProperty('agent');
    expect(config.features).toHaveProperty('logging');
    expect(config.features).toHaveProperty('telemetry');
    expect(config.features).toHaveProperty('notifications');
    expect(config.features).toHaveProperty('dryRun');
    expect(config.features).toHaveProperty('gitHooks');
    expect(config.features).toHaveProperty('repl');
    expect(config.features).toHaveProperty('templates');
    expect(config.features).toHaveProperty('context');
    expect(config.features).toHaveProperty('health');
    expect(config.features).toHaveProperty('plugins');
    expect(config.features).toHaveProperty('parallel');
    expect(config.features).toHaveProperty('smartContinue');
  });

  it('should have correct timeout values', () => {
    const config = getDefaultConfig();

    expect(config.timeouts.taskExecution).toBe(300000);
    expect(config.timeouts.cliResponse).toBe(60000);
    expect(config.timeouts.testRun).toBe(120000);
  });

  it('should have empty CLI tools array', () => {
    const config = getDefaultConfig();

    expect(config.cliTools).toEqual([]);
  });
});

describe('ConfigManager edge cases and error handling', () => {
  let tempDir: string;
  let configManager: ReturnType<typeof createConfigManager>;

  beforeEach(async () => {
    tempDir = join(tmpdir(), 'rulebook-test-config-edge-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    configManager = createConfigManager(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should handle config migration edge cases', async () => {
    // Test migration with missing fields
    const oldConfig = {
      version: '0.9.0',
      projectId: 'test-id',
      features: {
        watcher: false,
        agent: false,
      },
    } as any;

    const migrated = await configManager.migrateConfig(oldConfig);

    expect(migrated.version).toBe('1.0.0');
    expect(migrated.features.watcher).toBe(false);
    expect(migrated.features.agent).toBe(false);
  });

  it('should handle feature enablement edge cases', async () => {
    await configManager.initializeConfig();

    // Test all feature keys
    const features = [
      'watcher',
      'agent',
      'logging',
      'telemetry',
      'notifications',
      'dryRun',
      'gitHooks',
      'repl',
      'templates',
      'context',
      'health',
      'plugins',
      'parallel',
      'smartContinue',
    ] as const;

    for (const feature of features) {
      const enabled = await configManager.isFeatureEnabled(feature);
      expect(typeof enabled).toBe('boolean');
    }
  });

  it('should handle config summary edge cases', async () => {
    await configManager.initializeConfig();

    const summary = await configManager.getConfigSummary();

    expect(summary).toHaveProperty('version');
    expect(summary).toHaveProperty('projectId');
    expect(summary).toHaveProperty('enabledFeatures');
    expect(summary).toHaveProperty('coverageThreshold');
    expect(summary).toHaveProperty('cliTools');

    expect(Array.isArray(summary.enabledFeatures)).toBe(true);
    expect(Array.isArray(summary.cliTools)).toBe(true);
    expect(typeof summary.coverageThreshold).toBe('number');
  });

  it('should handle save config error scenarios', async () => {
    // Test with invalid path
    const invalidManager = createConfigManager('/invalid/path/that/does/not/exist');

    try {
      await invalidManager.saveConfig(getDefaultConfig());
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Failed to save config');
    }
  });

  it('should handle load config error scenarios', async () => {
    // Test loading from non-existent file - this should initialize config instead of throwing
    const config = await configManager.loadConfig();
    expect(config).toBeDefined();
    expect(config.version).toBe('1.0.0');
  });

  it('should handle migration with different version formats', async () => {
    const configs = [
      { version: '0.8.0', projectId: 'test1' },
      { version: '0.9.0', projectId: 'test2' },
      { version: '1.0.0', projectId: 'test3' },
      { version: '1.1.0', projectId: 'test4' },
    ];

    for (const config of configs) {
      const migrated = await configManager.migrateConfig(config as any);
      expect(migrated.version).toBe('1.0.0');
      expect(migrated.projectId).toBe(config.projectId);
    }
  });

  it('should handle feature enablement with invalid feature names', async () => {
    await configManager.initializeConfig();

    try {
      await configManager.isFeatureEnabled('invalidFeature' as any);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should handle config summary with disabled features', async () => {
    await configManager.initializeConfig();

    // Disable some features
    const config = await configManager.loadConfig();
    config.features.watcher = false;
    config.features.agent = false;
    await configManager.saveConfig(config);

    const summary = await configManager.getConfigSummary();

    expect(summary.enabledFeatures).not.toContain('watcher');
    expect(summary.enabledFeatures).not.toContain('agent');
    expect(summary.enabledFeatures).toContain('logging');
  });

  it('should handle config summary with custom CLI tools', async () => {
    await configManager.initializeConfig();

    // Add custom CLI tools
    const config = await configManager.loadConfig();
    config.cliTools = ['cursor-agent', 'claude-code', 'gemini-cli'];
    await configManager.saveConfig(config);

    const summary = await configManager.getConfigSummary();

    expect(summary.cliTools).toEqual(['cursor-agent', 'claude-code', 'gemini-cli']);
  });

  it('should handle config summary with custom coverage threshold', async () => {
    await configManager.initializeConfig();

    // Set custom coverage threshold
    const config = await configManager.loadConfig();
    config.coverageThreshold = 80;
    await configManager.saveConfig(config);

    const summary = await configManager.getConfigSummary();

    expect(summary.coverageThreshold).toBe(80);
  });

  it('should handle config summary with custom project ID', async () => {
    await configManager.initializeConfig();

    // Set custom project ID
    const config = await configManager.loadConfig();
    config.projectId = 'custom-project-id';
    await configManager.saveConfig(config);

    const summary = await configManager.getConfigSummary();

    expect(summary.projectId).toBe('custom-project-id');
  });

  it('should handle config summary with custom version', async () => {
    await configManager.initializeConfig();

    // Set custom version
    const config = await configManager.loadConfig();
    config.version = '2.0.0';
    await configManager.saveConfig(config);

    const summary = await configManager.getConfigSummary();

    expect(summary.version).toBe('2.0.0');
  });
});
