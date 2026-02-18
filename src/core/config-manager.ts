import { readFile, writeFile, existsSync, readFileSync } from 'fs';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import type { RulebookConfig } from '../types.js';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

const CONFIG_FILE = '.rulebook';

function getPackageVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const packagePath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version;
  } catch {
    return '2.2.0';
  }
}

export class ConfigManager {
  private configPath: string;
  private config: RulebookConfig | null = null;

  constructor(projectRoot: string) {
    this.configPath = join(projectRoot, CONFIG_FILE);
  }

  /**
   * Load configuration from .rulebook file
   */
  async loadConfig(): Promise<RulebookConfig> {
    if (this.config) {
      return this.config;
    }

    if (!existsSync(this.configPath)) {
      return await this.initializeConfig();
    }

    try {
      const data = await readFileAsync(this.configPath, 'utf-8');
      const loadedConfig = JSON.parse(data) as RulebookConfig;

      // Migrate config if needed
      const migratedConfig = await this.migrateConfig(loadedConfig);
      this.config = migratedConfig;

      return migratedConfig;
    } catch (error) {
      console.warn('Failed to load config, initializing new one:', error);
      return await this.initializeConfig();
    }
  }

  /**
   * Save configuration to .rulebook file
   */
  async saveConfig(config: RulebookConfig): Promise<void> {
    try {
      const configToSave = {
        ...config,
        updatedAt: new Date().toISOString(),
      };

      await writeFileAsync(this.configPath, JSON.stringify(configToSave, null, 2));
      this.config = configToSave;
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  /**
   * Initialize new configuration with defaults
   */
  async initializeConfig(): Promise<RulebookConfig> {
    const now = new Date().toISOString();
    const projectId = randomUUID();

    const defaultConfig: RulebookConfig = {
      version: getPackageVersion(),
      installedAt: now,
      updatedAt: now,
      projectId,
      mode: 'full',
      features: {
        watcher: true,
        agent: true,
        logging: true,
        telemetry: true,
        notifications: false,
        dryRun: false,
        gitHooks: false,
        repl: false,
        templates: false,
        context: false,
        health: false,
        plugins: false,
        parallel: false,
        smartContinue: false,
      },
      coverageThreshold: 95,
      language: 'en',
      outputLanguage: 'en',
      cliTools: [],
      maxParallelTasks: 1,
      timeouts: {
        taskExecution: 300000, // 5 minutes
        cliResponse: 60000, // 1 minute
        testRun: 120000, // 2 minutes
      },
    };

    await this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  /**
   * Migrate configuration from older versions
   */
  async migrateConfig(config: RulebookConfig): Promise<RulebookConfig> {
    const migrated = { ...config };

    // Add missing features with defaults
    const defaultFeatures = {
      watcher: true,
      agent: true,
      logging: true,
      telemetry: true,
      notifications: false,
      dryRun: false,
      gitHooks: false,
      repl: false,
      templates: false,
      context: false,
      health: false,
      plugins: false,
      parallel: false,
      smartContinue: false,
    };

    migrated.features = { ...defaultFeatures, ...migrated.features };

    if (!migrated.mode) {
      migrated.mode = 'full';
    }

    // Add missing top-level properties
    if (!migrated.outputLanguage) {
      migrated.outputLanguage = migrated.language || 'en';
    }
    if (!migrated.maxParallelTasks) {
      migrated.maxParallelTasks = 1;
    }
    if (!migrated.timeouts) {
      migrated.timeouts = {
        taskExecution: 300000,
        cliResponse: 60000,
        testRun: 120000,
      };
    }

    // Update version
    migrated.version = getPackageVersion();

    return migrated;
  }

  /**
   * Update specific configuration values
   */
  async updateConfig(updates: Partial<RulebookConfig>): Promise<RulebookConfig> {
    const currentConfig = await this.loadConfig();
    const updatedConfig = { ...currentConfig, ...updates };

    await this.saveConfig(updatedConfig);
    return updatedConfig;
  }

  /**
   * Enable or disable a feature
   */
  async toggleFeature(
    feature: keyof RulebookConfig['features'],
    enabled: boolean
  ): Promise<RulebookConfig> {
    const currentConfig = await this.loadConfig();
    const updatedConfig = {
      ...currentConfig,
      features: {
        ...currentConfig.features,
        [feature]: enabled,
      },
    };

    await this.saveConfig(updatedConfig);
    return updatedConfig;
  }

  /**
   * Detect available CLI tools
   */
  async detectCLITools(): Promise<string[]> {
    const { execa } = await import('execa');
    const cliTools: string[] = [];

    const tools = ['cursor-agent', 'claude-code', 'gemini-cli'];

    for (const tool of tools) {
      try {
        await execa(tool, ['--version'], { timeout: 5000 });
        cliTools.push(tool);
      } catch {
        // Tool not available
      }
    }

    return cliTools;
  }

  /**
   * Update detected CLI tools in config
   */
  async updateCLITools(): Promise<RulebookConfig> {
    const detectedTools = await this.detectCLITools();
    return await this.updateConfig({ cliTools: detectedTools });
  }

  /**
   * Get configuration value
   */
  async getConfigValue<K extends keyof RulebookConfig>(key: K): Promise<RulebookConfig[K]> {
    const config = await this.loadConfig();
    return config[key];
  }

  /**
   * Check if feature is enabled
   */
  async isFeatureEnabled(feature: keyof RulebookConfig['features']): Promise<boolean> {
    const config = await this.loadConfig();
    return config.features[feature];
  }

  /**
   * Get configuration summary
   */
  async getConfigSummary(): Promise<{
    version: string;
    projectId: string;
    enabledFeatures: string[];
    coverageThreshold: number;
    cliTools: string[];
  }> {
    const config = await this.loadConfig();

    const enabledFeatures = Object.entries(config.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature);

    return {
      version: config.version,
      projectId: config.projectId,
      enabledFeatures,
      coverageThreshold: config.coverageThreshold,
      cliTools: config.cliTools,
    };
  }
}

/**
 * Create a new ConfigManager instance
 */
export function createConfigManager(projectRoot: string): ConfigManager {
  return new ConfigManager(projectRoot);
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): RulebookConfig {
  const now = new Date().toISOString();
  const projectId = randomUUID();

  return {
    version: getPackageVersion(),
    installedAt: now,
    updatedAt: now,
    projectId,
    mode: 'full',
    features: {
      watcher: true,
      agent: true,
      logging: true,
      telemetry: true,
      notifications: false,
      dryRun: false,
      gitHooks: false,
      repl: false,
      templates: false,
      context: false,
      health: false,
      plugins: false,
      parallel: false,
      smartContinue: false,
    },
    coverageThreshold: 95,
    language: 'en',
    outputLanguage: 'en',
    cliTools: [],
    maxParallelTasks: 1,
    timeouts: {
      taskExecution: 300000,
      cliResponse: 60000,
      testRun: 120000,
    },
  };
}
