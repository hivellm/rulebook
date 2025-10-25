import chalk from 'chalk';
import { createOpenSpecManager } from './openspec-manager.js';
import { createLogger } from './logger.js';
import { createConfigManager } from './config-manager.js';
import type { OpenSpecTask } from '../types.js';

export class WatcherUI {
  private openspecManager: ReturnType<typeof createOpenSpecManager>;
  private logger: ReturnType<typeof createLogger>;
  private configManager: ReturnType<typeof createConfigManager>;
  private isRunning = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private currentTask: OpenSpecTask | null = null;
  private recentActivity: Array<{
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }> = [];

  constructor(projectRoot: string) {
    this.openspecManager = createOpenSpecManager(projectRoot);
    this.logger = createLogger(projectRoot);
    this.configManager = createConfigManager(projectRoot);
  }

  /**
   * Start the watcher UI
   */
  async start(): Promise<void> {
    console.clear();
    this.isRunning = true;
    
    // Setup signal handlers
    this.setupSignalHandlers();
    
    // Initialize components
    await this.initialize();
    
    // Start refresh loop
    this.startRefreshLoop();
    
    // Initial render
    await this.render();
    
    console.log(chalk.gray('\nPress Ctrl+C or F10 to exit'));
  }

  /**
   * Stop the watcher UI
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    await this.logger.close();
    console.clear();
    console.log(chalk.green('Watcher stopped'));
  }

  /**
   * Initialize watcher components
   */
  private async initialize(): Promise<void> {
    try {
      await this.openspecManager.initialize();
      await this.configManager.loadConfig();
      
      this.logger.info('Watcher UI initialized');
      this.addActivity('Watcher initialized', 'info');
    } catch (error) {
      this.logger.error('Failed to initialize watcher', { error: String(error) });
      this.addActivity(`Initialization failed: ${error}`, 'error');
    }
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const cleanup = async () => {
      await this.stop();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);  // Ctrl+C
    process.on('SIGTERM', cleanup);
    
    // Handle F10 key (if supported by terminal)
    process.stdin.on('data', (data) => {
      if (data.toString() === '\u0003') { // Ctrl+C
        cleanup();
      }
    });
  }

  /**
   * Start the refresh loop
   */
  private startRefreshLoop(): void {
    this.refreshInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.update();
        await this.render();
      }
    }, 2000); // Refresh every 2 seconds
  }

  /**
   * Update watcher state
   */
  private async update(): Promise<void> {
    try {
      // Get current task
      const currentTask = await this.openspecManager.getCurrentTask();
      if (currentTask && currentTask.id !== this.currentTask?.id) {
        this.currentTask = currentTask;
        this.addActivity(`Started task: ${currentTask.title}`, 'info');
      }

      // Get recent logs for activity
      const recentLogs = await this.logger.getRecentLogs(5);
      for (const log of recentLogs) {
        if (this.isNewActivity(log)) {
          this.addActivity(log.message, this.mapLogLevelToType(log.level));
        }
      }
    } catch (error) {
      this.logger.error('Failed to update watcher state', { error: String(error) });
    }
  }

  /**
   * Check if log entry is new activity
   */
  private isNewActivity(log: any): boolean {
    const lastActivity = this.recentActivity[this.recentActivity.length - 1];
    return !lastActivity || lastActivity.timestamp !== log.timestamp;
  }

  /**
   * Add activity to recent activity list
   */
  private addActivity(message: string, type: 'info' | 'success' | 'warning' | 'error'): void {
    this.recentActivity.push({
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    });

    // Keep only last 10 activities
    if (this.recentActivity.length > 10) {
      this.recentActivity = this.recentActivity.slice(-10);
    }
  }

  /**
   * Map log level to activity type
   */
  private mapLogLevelToType(level: string): 'info' | 'success' | 'warning' | 'error' {
    switch (level) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'success';
      default: return 'info';
    }
  }

  /**
   * Render the watcher UI
   */
  private async render(): Promise<void> {
    try {
      console.clear();
      
      // Header
      this.renderHeader();
      
      // Main content
      await this.renderMainContent();
      
      // Footer
      this.renderFooter();
      
    } catch (error) {
      console.error('Render error:', error);
    }
  }

  /**
   * Render header
   */
  private renderHeader(): void {
    const header = [
      '╔══════════════════════════════════════════════════════════╗',
      '║  RULEBOOK WATCHER                          [Ctrl+C/F10] ║',
      '╠══════════════════════════════════════════════════════════╣'
    ].join('\n');
    
    console.log(chalk.blue(header));
  }

  /**
   * Render main content
   */
  private async renderMainContent(): Promise<void> {
    // Current task section
    await this.renderCurrentTask();
    
    // Progress section
    await this.renderProgress();
    
    // Status section
    await this.renderStatus();
    
    // Recent activity section
    this.renderRecentActivity();
  }

  /**
   * Render current task
   */
  private async renderCurrentTask(): Promise<void> {
    const task = this.currentTask || await this.openspecManager.getCurrentTask();
    
    if (task) {
      const statusIcon = this.getTaskStatusIcon(task.status);
      
      console.log(chalk.white(`║  Current Task: ${statusIcon} ${task.title}`));
      console.log(chalk.gray(`║  Description: ${task.description}`));
      console.log(chalk.gray(`║  Priority: ${task.priority} | Attempts: ${task.attempts}`));
    } else {
      console.log(chalk.gray('║  Current Task: No active task'));
    }
    
    console.log(chalk.gray('╠══════════════════════════════════════════════════════════╣'));
  }

  /**
   * Render progress section
   */
  private async renderProgress(): Promise<void> {
    const stats = await this.openspecManager.getTaskStats();
    const total = stats.total;
    const completed = stats.completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const progressBar = this.generateProgressBar(percentage);
    
    console.log(chalk.white(`║  Progress: ${progressBar} ${percentage}% (${completed}/${total} tasks)`));
    console.log(chalk.gray('╠══════════════════════════════════════════════════════════╣'));
  }

  /**
   * Render status section
   */
  private async renderStatus(): Promise<void> {
    const config = await this.configManager.loadConfig();
    const enabledFeatures = Object.entries(config.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature);
    
    console.log(chalk.white(`║  Status: ${enabledFeatures.length} features enabled`));
    console.log(chalk.gray(`║  Coverage Threshold: ${config.coverageThreshold}%`));
    console.log(chalk.gray(`║  CLI Tools: ${config.cliTools.join(', ') || 'None detected'}`));
    console.log(chalk.gray('╠══════════════════════════════════════════════════════════╣'));
  }

  /**
   * Render recent activity
   */
  private renderRecentActivity(): void {
    console.log(chalk.white('║  Recent Activity:'));
    
    if (this.recentActivity.length === 0) {
      console.log(chalk.gray('║    No recent activity'));
    } else {
      for (const activity of this.recentActivity.slice(-5)) {
        const color = this.getActivityColor(activity.type);
        const icon = this.getActivityIcon(activity.type);
        console.log(chalk.gray(`║  [${activity.timestamp}] ${color(`${icon} ${activity.message}`)}`));
      }
    }
  }

  /**
   * Render footer
   */
  private renderFooter(): void {
    const footer = [
      '╚══════════════════════════════════════════════════════════╝'
    ].join('\n');
    
    console.log(chalk.blue(footer));
  }

  /**
   * Generate progress bar
   */
  private generateProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  /**
   * Get task status icon
   */
  private getTaskStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✓';
      case 'in-progress': return '⚙';
      case 'failed': return '✗';
      case 'skipped': return '⊘';
      default: return '○';
    }
  }

  /**
   * Get activity color
   */
  private getActivityColor(type: string): (text: string) => string {
    switch (type) {
      case 'success': return chalk.green;
      case 'warning': return chalk.yellow;
      case 'error': return chalk.red;
      default: return chalk.white;
    }
  }

  /**
   * Get activity icon
   */
  private getActivityIcon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✗';
      default: return 'ℹ';
    }
  }
}

/**
 * Create and start watcher UI
 */
export async function startWatcher(projectRoot: string): Promise<void> {
  const watcher = new WatcherUI(projectRoot);
  await watcher.start();
}

/**
 * Create watcher UI instance
 */
export function createWatcherUI(projectRoot: string): WatcherUI {
  return new WatcherUI(projectRoot);
}


