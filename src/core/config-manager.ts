import { readFile, writeFile, existsSync, readFileSync } from 'fs';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { cp, rm, mkdir } from 'fs/promises';
import type { RulebookConfig } from '../types.js';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

const CONFIG_DIR = '.rulebook';
const CONFIG_FILE = 'rulebook.json';

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
  private configDir: string;
  private projectRoot: string;
  private config: RulebookConfig | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.configDir = join(projectRoot, CONFIG_DIR);
    this.configPath = join(this.configDir, CONFIG_FILE);
  }

  /**
   * Load configuration from .rulebook/rulebook.json file
   */
  async loadConfig(): Promise<RulebookConfig> {
    if (this.config) {
      return this.config;
    }

    // Migrate old .rulebook file to new directory structure if needed
    await this.migrateOldRulebookFile();

    // Migrate old rulebook/ directory into .rulebook/
    await this.migrateRulebookDirectory();

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
   * Save configuration to .rulebook/rulebook.json file
   */
  async saveConfig(config: RulebookConfig): Promise<void> {
    try {
      const fsPromises = await import('fs/promises');

      // Check if .rulebook exists as a file (old structure) and remove it
      const oldConfigPath = join(this.projectRoot, '.rulebook');
      if (existsSync(oldConfigPath)) {
        const stats = await fsPromises.stat(oldConfigPath);
        if (stats.isFile()) {
          // It's a file, remove it
          await fsPromises.rm(oldConfigPath, { force: true });
        }
      }

      // Ensure .rulebook directory exists
      await mkdir(this.configDir, { recursive: true });

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
   * Migrate old .rulebook file to new .rulebook/rulebook.json structure
   */
  private async migrateOldRulebookFile(): Promise<void> {
    const oldConfigPath = join(this.projectRoot, '.rulebook');
    const fsPromises = await import('fs/promises');

    // Check if old .rulebook file exists and is a file (not directory)
    if (!existsSync(oldConfigPath)) {
      return;
    }

    try {
      const stats = await fsPromises.stat(oldConfigPath);
      if (stats.isDirectory()) {
        // Already migrated
        return;
      }

      // Old file exists as a file, migrate it
      const data = await readFileAsync(oldConfigPath, 'utf-8');
      const config = JSON.parse(data) as RulebookConfig;

      // Remove old file first (before creating directory with same name)
      await fsPromises.rm(oldConfigPath, { force: true });

      // Create .rulebook directory
      await mkdir(this.configDir, { recursive: true });

      // Save config to new location
      await this.saveConfig(config);
    } catch {
      // Silently skip migration errors - they'll be handled by loadConfig
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
      memory: {
        enabled: true,
        dbPath: '.rulebook/memory/memory.db',
        maxSizeBytes: 524288000,
        autoCapture: true,
        vectorDimensions: 256,
      },
      ralph: {
        enabled: true,
        maxIterations: 10,
        tool: 'claude',
        maxContextLoss: 3,
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

    // Migrate directory structure from old to new layout
    const projectRoot = dirname(this.configPath);
    await this.migrateDirectoryStructure(projectRoot);

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

    // Add/update memory config with defaults enabled
    if (!migrated.memory) {
      migrated.memory = {
        enabled: true,
        dbPath: '.rulebook/memory/memory.db',
        maxSizeBytes: 524288000,
        autoCapture: true,
        vectorDimensions: 256,
      };
    } else {
      // Ensure memory is enabled in migration
      migrated.memory.enabled = true;
      if (!migrated.memory.dbPath) migrated.memory.dbPath = '.rulebook/memory/memory.db';
      if (!migrated.memory.maxSizeBytes) migrated.memory.maxSizeBytes = 524288000;
      if (migrated.memory.autoCapture === undefined) migrated.memory.autoCapture = true;
      if (!migrated.memory.vectorDimensions) migrated.memory.vectorDimensions = 256;
    }

    // Add/update Ralph config with defaults enabled
    if (!migrated.ralph) {
      migrated.ralph = {
        enabled: true,
        maxIterations: 10,
        tool: 'claude',
        maxContextLoss: 3,
      };
    } else {
      // Ensure Ralph is enabled in migration
      migrated.ralph.enabled = true;
      if (!migrated.ralph.maxIterations) migrated.ralph.maxIterations = 10;
      if (!migrated.ralph.tool) migrated.ralph.tool = 'claude';
      if (!migrated.ralph.maxContextLoss) migrated.ralph.maxContextLoss = 3;
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

  /**
   * Migrate old rulebook/ directory into .rulebook/
   * Moves rulebook/specs/ → .rulebook/specs/ and rulebook/tasks/ → .rulebook/tasks/
   * Then removes the now-empty rulebook/ directory
   */
  async migrateRulebookDirectory(): Promise<void> {
    const fsPromises = await import('fs/promises');
    const oldRulebookDir = join(this.projectRoot, 'rulebook');
    const newRulebookDir = join(this.projectRoot, '.rulebook');

    // Only migrate if old rulebook/ directory exists
    if (!existsSync(oldRulebookDir)) {
      return;
    }

    try {
      const stats = await fsPromises.stat(oldRulebookDir);
      if (!stats.isDirectory()) {
        return;
      }
    } catch {
      return;
    }

    try {
      // Ensure .rulebook directory exists
      await mkdir(newRulebookDir, { recursive: true });

      // Migrate specs/
      const oldSpecsDir = join(oldRulebookDir, 'specs');
      const newSpecsDir = join(newRulebookDir, 'specs');
      if (existsSync(oldSpecsDir)) {
        if (!existsSync(newSpecsDir)) {
          await cp(oldSpecsDir, newSpecsDir, { recursive: true });
        }
        await rm(oldSpecsDir, { recursive: true, force: true });
      }

      // Migrate tasks/
      const oldTasksDir = join(oldRulebookDir, 'tasks');
      const newTasksDir = join(newRulebookDir, 'tasks');
      if (existsSync(oldTasksDir)) {
        if (!existsSync(newTasksDir)) {
          await cp(oldTasksDir, newTasksDir, { recursive: true });
        }
        await rm(oldTasksDir, { recursive: true, force: true });
      }

      // Remove empty rulebook/ directory if it's now empty
      try {
        const remaining = await fsPromises.readdir(oldRulebookDir);
        if (remaining.length === 0) {
          await rm(oldRulebookDir, { recursive: true, force: true });
        }
      } catch {
        // Ignore errors reading the directory
      }
    } catch (error) {
      console.warn(`Rulebook directory migration warning: ${error}`);
    }
  }

  /**
   * Migrate old directory structure to new consolidated structure
   * Moves .rulebook-memory/ to .rulebook/memory/ and .rulebook-ralph/ to .rulebook/ralph/
   */
  async migrateDirectoryStructure(projectRoot: string): Promise<void> {
    const fsPromises = await import('fs/promises');
    const { mkdir } = fsPromises;
    const oldMemoryDir = join(projectRoot, '.rulebook-memory');
    const oldRalphDir = join(projectRoot, '.rulebook-ralph');
    const newRulebookDir = join(projectRoot, '.rulebook');
    const newMemoryDir = join(newRulebookDir, 'memory');
    const newRalphDir = join(newRulebookDir, 'ralph');

    try {
      // Check if .rulebook exists
      if (existsSync(newRulebookDir)) {
        const stats = await fsPromises.stat(newRulebookDir);
        if (stats.isFile()) {
          // Old .rulebook file exists, remove it
          await fsPromises.rm(newRulebookDir, { force: true });
        } else if (stats.isDirectory()) {
          // Already migrated to directory structure, skip migration
          // Clean up accidental subdirectories and exit
          const accidentalDir = join(newRulebookDir, '.rulebook');
          if (existsSync(accidentalDir)) {
            await fsPromises.rm(accidentalDir, { recursive: true, force: true });
          }
          return;
        }
      }

      // Create parent .rulebook directory if needed
      if (!existsSync(newRulebookDir)) {
        await mkdir(newRulebookDir, { recursive: true });
      }

      // Migrate memory directory if it exists (but not if it's already in new location)
      // Also prevent copying .rulebook into itself
      if (
        existsSync(oldMemoryDir) &&
        oldMemoryDir !== newMemoryDir &&
        !oldMemoryDir.includes(newRulebookDir)
      ) {
        if (!existsSync(newMemoryDir)) {
          await cp(oldMemoryDir, newMemoryDir, { recursive: true });
        }
        // Remove old directory after successful copy
        await rm(oldMemoryDir, { recursive: true, force: true });
      }

      // Migrate ralph directory if it exists (but not if it's already in new location)
      // Also prevent copying .rulebook into itself
      if (
        existsSync(oldRalphDir) &&
        oldRalphDir !== newRalphDir &&
        !oldRalphDir.includes(newRulebookDir)
      ) {
        if (!existsSync(newRalphDir)) {
          await cp(oldRalphDir, newRalphDir, { recursive: true });
        }
        // Remove old directory after successful copy
        await rm(oldRalphDir, { recursive: true, force: true });
      }

      // Clean up any accidental .rulebook/.rulebook directory
      const accidentalDir = join(newRulebookDir, '.rulebook');
      if (existsSync(accidentalDir)) {
        await rm(accidentalDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Log error but don't fail - migration is non-critical
      // Still clean up accidental directories even if there's an error
      try {
        const accidentalDir = join(newRulebookDir, '.rulebook');
        if (existsSync(accidentalDir)) {
          const fsP = await import('fs/promises');
          await fsP.rm(accidentalDir, { recursive: true, force: true });
        }
      } catch {
        // Ignore cleanup errors
      }
      console.warn(`Directory migration warning: ${error}`);
    }
  }

  /**
   * Ensure .gitignore has .rulebook entries with specs/ and tasks/ exceptions
   */
  async ensureGitignore(): Promise<void> {
    const gitignorePath = join(this.projectRoot, '.gitignore');
    const rulebookBlock = [
      '',
      '# Rulebook - ignore runtime data, keep specs and tasks',
      '/.rulebook/*',
      '!/.rulebook/specs/',
      '!/.rulebook/tasks/',
      '!/.rulebook/rulebook.json',
    ].join('\n');

    try {
      if (existsSync(gitignorePath)) {
        let content = await readFileAsync(gitignorePath, 'utf-8');

        // Already has the correct block with exceptions
        if (content.includes('!/.rulebook/specs/')) {
          return;
        }

        // Has old-style entry without exceptions — replace it
        if (content.includes('.rulebook')) {
          // Remove old entries (with or without leading /)
          const lines = content.split('\n');
          const filtered = lines.filter((line) => {
            const trimmed = line.trim();
            return (
              trimmed !== '.rulebook' &&
              trimmed !== '.rulebook/' &&
              trimmed !== '.rulebook/*' &&
              trimmed !== '/.rulebook' &&
              trimmed !== '/.rulebook/' &&
              trimmed !== '/.rulebook/*' &&
              trimmed !== '!.rulebook/specs/' &&
              trimmed !== '!.rulebook/tasks/' &&
              trimmed !== '!.rulebook/rulebook.json' &&
              trimmed !== '# Rulebook - ignore runtime data, keep specs and tasks'
            );
          });
          content = filtered.join('\n');
        }

        // Append the correct block
        const separator = content.endsWith('\n') ? '' : '\n';
        await writeFileAsync(gitignorePath, content + separator + rulebookBlock + '\n');
      } else {
        await writeFileAsync(gitignorePath, rulebookBlock.trimStart() + '\n');
      }
    } catch {
      // Non-critical, don't fail init
    }
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
    memory: {
      enabled: false,
    },
  };
}
