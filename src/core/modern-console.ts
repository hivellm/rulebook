import blessed from 'blessed';
import { createOpenSpecManager } from './openspec-manager.js';
import type { OpenSpecTask } from '../types.js';
import type { AgentManager } from './agent-manager.js';

export interface ModernConsoleOptions {
  projectRoot: string;
  refreshInterval?: number;
  agentManager?: AgentManager;
}

interface ActivityLogEntry {
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error' | 'tool';
  message: string;
}

/**
 * Simplified Progress-Focused Modern Console
 * New UI: Active Tasks + Progress Bar + Activity Logs
 */
export class ModernConsole {
  private screen: blessed.Widgets.Screen;
  private openspecManager: ReturnType<typeof createOpenSpecManager>;
  private options: ModernConsoleOptions;
  private isRunning = false;
  private refreshTimer?: NodeJS.Timeout;
  private animationFrame = 0;

  // UI Components
  private headerBox!: blessed.Widgets.BoxElement;
  private activeTasksBox!: blessed.Widgets.BoxElement;
  private progressBox!: blessed.Widgets.BoxElement;
  private logsBox!: blessed.Widgets.BoxElement;
  private statusBar!: blessed.Widgets.BoxElement;

  // Data
  private tasks: OpenSpecTask[] = [];
  private activityLogs: ActivityLogEntry[] = [];
  private agentManager?: AgentManager;
  private isAgentRunning = false;

  constructor(options: ModernConsoleOptions) {
    this.options = {
      refreshInterval: 100, // 100ms for smooth animations
      ...options,
    };

    this.agentManager = options.agentManager;
    this.openspecManager = createOpenSpecManager(options.projectRoot);

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Rulebook Watcher',
      fullUnicode: true,
      dockBorders: true,
      autoPadding: true,
      warnings: false,
    });

    this.setupUI();
    this.setupEventHandlers();
  }

  private setupUI(): void {
    // Header (3 lines)
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '{center}{bold}{blue-fg}🤖 RULEBOOK WATCHER{/blue-fg}{/bold}                          {gray-fg}[F10 Exit]{/gray-fg}{/center}',
      tags: true,
      style: {
        bg: 'blue',
        fg: 'white',
        bold: true,
      },
      border: {
        type: 'line' as const,
        fg: 4, // blue
      },
    });

    // Active Tasks (~8 lines)
    this.activeTasksBox = blessed.box({
      top: 3,
      left: 0,
      width: '100%',
      height: 10,
      label: ' {bold}📋 ACTIVE TASKS{/bold} ',
      tags: true,
      scrollable: false,
      style: {
        fg: 'white',
      },
      border: {
        type: 'line' as const,
        fg: 6, // cyan
      },
    });

    // Progress Bar (3 lines fixed)
    this.progressBox = blessed.box({
      top: 13,
      left: 0,
      width: '100%',
      height: 5,
      label: ' {bold}📊 PROGRESS{/bold} ',
      tags: true,
      style: {
        fg: 'white',
      },
      border: {
        type: 'line' as const,
        fg: 2, // green
      },
    });

    // Activity Logs (remaining space)
    this.logsBox = blessed.box({
      top: 18,
      left: 0,
      width: '100%',
      height: '100%-19',  // Fixed height: from line 18 to status bar
      label: ' {bold}📝 ACTIVITY LOGS{/bold} ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: '█',
        track: {
          bg: 'black',
          ch: '░',
        },
        style: {
          inverse: false,
          fg: 'blue',
          bg: 'black',
          bold: true,
        },
      },
      keys: true,
      vi: true,
      mouse: true,
      style: {
        fg: 'white',
      },
      border: {
        type: 'line' as const,
        fg: 3, // yellow
      },
    });

    // Status Bar (1 line)
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: ' Press F10 or Ctrl+C to exit',
      tags: true,
      style: {
        bg: 'blue',
        fg: 'white',
      },
    });

    // Add to screen
    this.screen.append(this.headerBox);
    this.screen.append(this.activeTasksBox);
    this.screen.append(this.progressBox);
    this.screen.append(this.logsBox);
    this.screen.append(this.statusBar);

    this.screen.render();
  }

  private setupEventHandlers(): void {
    // Exit on F10 or Ctrl+C
    this.screen.key(['f10', 'C-c'], () => {
      this.stop();
    });

    // Start agent on 'A' key
    this.screen.key(['a', 'A'], async () => {
      if (!this.isAgentRunning && this.agentManager) {
        this.logActivity('info', 'Starting autonomous agent...');
        this.isAgentRunning = true;
        this.updateStatusBar();
        
        try {
          await this.agentManager.startAgent({
            tool: 'cursor-agent',
            maxIterations: 10,
            watchMode: false,
            onLog: (type, message) => {
              this.logActivity(type, message);
            },
          });
          
          this.logActivity('success', 'Agent completed successfully');
        } catch (error) {
          this.logActivity('error', `Agent failed: ${error}`);
        } finally {
          this.isAgentRunning = false;
          this.updateStatusBar();
          await this.refreshTasks();
        }
      } else if (this.isAgentRunning) {
        this.logActivity('warning', 'Agent is already running');
      } else {
        this.logActivity('error', 'Agent manager not initialized');
      }
    });

    // Refresh on 'R' key
    this.screen.key(['r', 'R'], async () => {
      this.logActivity('info', 'Refreshing tasks...');
      await this.refreshTasks();
    });

    // Focus logs box for scrolling
    this.logsBox.focus();
  }

  /**
   * Update status bar
   */
  private updateStatusBar(): void {
    const agentStatus = this.isAgentRunning ? '{green-fg}Agent Running{/green-fg}' : '';
    this.statusBar.setContent(` Press F10 or Ctrl+C to exit | Press A to start agent | Press R to refresh ${agentStatus}`);
    this.screen.render();
  }

  /**
   * Refresh tasks from OpenSpec
   */
  private async refreshTasks(): Promise<void> {
    try {
      const data = await this.openspecManager.loadOpenSpec();
      this.tasks = data.tasks;
      this.logActivity('success', `Refreshed ${this.tasks.length} tasks`);
      this.render();
    } catch (error) {
      this.logActivity('error', `Failed to refresh tasks: ${error}`);
    }
  }

  /**
   * Get loading spinner frame
   */
  private getLoadingFrame(): string {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    return frames[this.animationFrame % frames.length];
  }

  /**
   * Format duration in HH:MM:SS
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const h = String(hours).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');

    return `${h}:${m}:${s}`;
  }

  /**
   * Render active tasks (max 5, auto-remove completed)
   */
  private renderActiveTasks(): void {
    const activeTasks = this.tasks.filter(t => t.status !== 'completed').slice(0, 5);

    if (activeTasks.length === 0) {
      this.activeTasksBox.setContent('\n  {gray-fg}No active tasks{/gray-fg}');
      return;
    }

    const lines: string[] = ['\n'];
    
    for (const task of activeTasks) {
      const icon = task.status === 'in-progress' 
        ? `{cyan-fg}${this.getLoadingFrame()}{/cyan-fg}` 
        : '{gray-fg}⏸ {/gray-fg}';

      const status = task.status === 'in-progress' ? 'In Progress' : 'Pending';
      const duration = task.status === 'in-progress' && task.metadata?.startedAt
        ? ` | Duration: ${this.formatDuration(Date.now() - new Date(task.metadata.startedAt).getTime())}`
        : '';

      lines.push(`  ${icon} {bold}${task.title}{/bold}`);
      lines.push(`     Status: ${status}${duration}\n`);
    }

    this.activeTasksBox.setContent(lines.join('\n'));
  }

  /**
   * Render progress bar
   */
  private renderProgressBar(): void {
    const allTasks = [...this.tasks.filter(t => t.status === 'completed'), ...this.tasks.filter(t => t.status !== 'completed')];
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const total = allTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate bar width (screen width - borders - padding)
    const screenWidth = this.screen.width;
    const barWidth = typeof screenWidth === 'number' ? Math.max(40, screenWidth - 20) : 40;
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;

    const filled = '█'.repeat(filledWidth);
    const empty = '░'.repeat(emptyWidth);

    // Color based on progress
    let color = 'green';
    if (percentage < 50) color = 'red';
    else if (percentage < 75) color = 'yellow';

    const bar = `\n  {${color}-fg}${filled}{/}${empty} {bold}{white-fg}${percentage}%{/} {gray-fg}(${completed}/${total}){/}\n`;

    this.progressBox.setContent(bar);
  }

  /**
   * Render activity logs (last 10 entries)
   */
  private renderActivityLogs(): void {
    if (this.activityLogs.length === 0) {
      this.logsBox.setContent('\n  {gray-fg}No activity yet{/gray-fg}');
      return;
    }

    const LOG_ICONS = {
      success: '{green-fg}✅{/}',
      info: '{blue-fg}ℹ️ {/}',
      warning: '{yellow-fg}⚠️ {/}',
      error: '{red-fg}❌{/}',
      tool: '{cyan-fg}🔧{/}',
    };

    const lines = this.activityLogs
      .slice(-20) // Last 20 entries
      .map(entry => {
        const time = entry.timestamp.toLocaleTimeString('en-US', { hour12: false });
        const icon = LOG_ICONS[entry.type];
        return `{gray-fg}[${time}]{/} ${icon} ${entry.message}`;
      });

    this.logsBox.setContent('\n' + lines.join('\n') + '\n');
    
    // Auto-scroll to bottom
    this.logsBox.setScrollPerc(100);
  }

  /**
   * Log activity
   */
  public logActivity(type: ActivityLogEntry['type'], message: string): void {
    this.activityLogs.push({
      timestamp: new Date(),
      type,
      message,
    });

    // Keep only last 100 entries in memory
    if (this.activityLogs.length > 100) {
      this.activityLogs = this.activityLogs.slice(-100);
    }

    this.render();
  }

  /**
   * Mark task as completed and remove from list
   */
  public markTaskCompleted(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      this.logActivity('success', `Task completed: ${task.title}`);
      
      // Remove from active tasks
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      
      this.render();
    }
  }

  /**
   * Mark task as in progress
   */
  public markTaskInProgress(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'in-progress';
      if (!task.metadata) task.metadata = {};
      task.metadata.startedAt = new Date().toISOString();
      
      this.logActivity('info', `Task started: ${task.title}`);
      this.render();
    }
  }

  /**
   * Render all components
   */
  private render(): void {
    this.renderActiveTasks();
    this.renderProgressBar();
    this.renderActivityLogs();
    this.screen.render();
  }

  /**
   * Start watching
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      await this.openspecManager.initialize();
      const data = await this.openspecManager.loadOpenSpec();
      this.tasks = data.tasks;

      this.logActivity('info', 'Watcher started');
      this.updateStatusBar();
      this.render();

      // Animation timer (for loading spinner)
      this.refreshTimer = setInterval(() => {
        this.animationFrame++;
        
        // Only render if there are in-progress tasks (to show spinner)
        const hasInProgress = this.tasks.some(t => t.status === 'in-progress');
        if (hasInProgress) {
          this.render();
        }
      }, this.options.refreshInterval);

    } catch (error) {
      this.logActivity('error', `Failed to start: ${error}`);
      throw error;
    }
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    this.screen.destroy();
    process.exit(0);
  }
}

/**
 * Factory function
 */
export function createModernConsole(options: ModernConsoleOptions): ModernConsole {
  return new ModernConsole(options);
}

