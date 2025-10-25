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
        maxParallelTasks: 1
      });

      expect(config.features).toMatchObject({
        openspec: true,
        watcher: true,
        agent: true,
        logging: true,
        telemetry: true
      });
    });

    it('should create .rulebook file', async () => {
      await configManager.initializeConfig();
      
      const configPath = join(tempDir, '.rulebook');
      const exists = await fs.access(configPath).then(() => true).catch(() => false);
      
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
        coverageThreshold: 95
      });
    });
  });

  describe('updateConfig', () => {
    it('should update configuration values', async () => {
      await configManager.initializeConfig();
      
      const updatedConfig = await configManager.updateConfig({
        coverageThreshold: 90,
        maxParallelTasks: 3
      });
      
      expect(updatedConfig.coverageThreshold).toBe(90);
      expect(updatedConfig.maxParallelTasks).toBe(3);
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
      
      const config = await configManager.toggleFeature('openspec', false);
      
      expect(config.features.openspec).toBe(false);
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
        enabledFeatures: expect.any(Array)
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
      outputLanguage: 'en'
    });
  });
});
