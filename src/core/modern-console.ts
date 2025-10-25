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
  private isRunning = false;

  // UI Components
  private headerBox!: blessed.Widgets.BoxElement;
  private progressBar!: any; // ProgressBar widget from blessed
  private progressBox!: blessed.Widgets.BoxElement;
  private tasksBox!: blessed.Widgets.BoxElement;
  private logsBox!: blessed.Widgets.BoxElement;
  private statusBar!: blessed.Widgets.BoxElement;

  // Data
  private tasks: OpenSpecTask[] = [];
  private history: OpenSpecTask[] = [];
  private activityLogs: ActivityLogEntry[] = [];
  private agentManager?: AgentManager;
  private isAgentRunning = false;

  // Performance optimization
  private lastRenderTime = 0;
  private renderThrottleMs = 100; // Throttle renders to max 10 FPS
  private pendingRender = false;
  private lastProgressInfo = { completed: 0, total: 0, percentage: 0 };
  private lastActivityLogCount = 0;
  private lastTaskCount = 0;

  constructor(options: ModernConsoleOptions) {
    this.agentManager = options.agentManager;

    // Use the same openspecManager as the agent to avoid loading different tasks
    if (this.agentManager) {
      // Get the openspecManager from agentManager (we'll need to expose it)
      this.openspecManager = createOpenSpecManager(options.projectRoot);
    } else {
      this.openspecManager = createOpenSpecManager(options.projectRoot);
    }

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
    // Calculate responsive dimensions based on terminal size
    const screenHeight = typeof this.screen.height === 'number' ? this.screen.height : 24;
    const screenWidth = typeof this.screen.width === 'number' ? this.screen.width : 80;
    
    // Ensure minimum terminal size
    const minHeight = 24;
    const minWidth = 80;
    
    if (screenHeight < minHeight || screenWidth < minWidth) {
      throw new Error(`Terminal too small. Minimum size: ${minWidth}x${minHeight}, current: ${screenWidth}x${screenHeight}`);
    }

    // Calculate layout dimensions - Responsive layout (25% tasks, 10% progress, 65% logs)
    const headerHeight = 3;
    const statusHeight = 1;
    const availableHeight = screenHeight - headerHeight - statusHeight;
    
    // Calculate proportional heights
    const progressHeight = Math.max(3, Math.round(availableHeight * 0.1)); // 10% for progress
    const tasksHeight = Math.max(5, Math.round(availableHeight * 0.25)); // 25% for tasks
    const logsHeight = availableHeight - progressHeight - tasksHeight; // 65% for logs

    // Header (3 lines)
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: headerHeight,
      content:
        '{center}{bold}{cyan-fg}🤖 RULEBOOK WATCHER{/cyan-fg}{/bold}                          {gray-fg}[F10 Exit]{/gray-fg}{/center}',
      tags: true,
      style: {
        bg: 'black',
        fg: 'white',
        bold: true,
        border: {
          fg: 'cyan',
        },
      },
      border: {
        type: 'line' as const,
        fg: 6, // cyan
      },
    });

    // Progress Bar Container - Fixed small height for compact display
    this.progressBox = blessed.box({
      top: headerHeight,
      left: 0,
      width: '100%',
      height: progressHeight,
      label: ' {bold}📊 PROGRESS{/bold} ',
      tags: true,
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'green',
        },
      },
      border: {
        type: 'line' as const,
        fg: 2, // green
      },
      padding: {
        left: 1,
        right: 1,
        top: 0,
        bottom: 0,
      },
    });

    // ProgressBar widget - custom implementation using text
    this.progressBar = blessed.text({
      parent: this.progressBox,
      top: 0,
      left: 1,
      width: 40,
      height: 1,
      content: '░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░',
      tags: true,
      style: {
        fg: 'green',
        bg: 'black',
      },
    });

    // Progress details label - next to the bar
    const progressLabel = blessed.text({
      parent: this.progressBox,
      top: 0,
      left: 42,
      width: '100%-42',
      height: 1,
      content: '',
      tags: true,
    });
    
    // Store reference for updates
    (this as any).progressLabel = progressLabel;

    // Active Tasks Panel (25% of available space)
    this.tasksBox = blessed.box({
      top: headerHeight + progressHeight,
      left: 0,
      width: '100%',
      height: tasksHeight,
      label: ' {bold}📋 ACTIVE TASKS{/bold} ',
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
          fg: 'cyan',
          bg: 'black',
          bold: true,
        },
      },
      keys: true,
      vi: true,
      mouse: true,
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: 'cyan',
        },
      },
      padding: {
        left: 1,
        right: 1,
        top: 1,
        bottom: 1,
      },
    });

    // Activity Logs (65% of available space)
    this.logsBox = blessed.box({
      top: headerHeight + progressHeight + tasksHeight,
      left: 0,
      width: '100%',
      height: logsHeight,
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
        bg: 'black',
        border: {
          fg: 'blue',
        },
      },
      padding: {
        left: 1,
        right: 1,
        top: 1,
        bottom: 1,
      },
    });

    // Status Bar (1 line)
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: statusHeight,
      content: ' Press F10 or Ctrl+C to exit | Press A to start agent | Press R to refresh',
      tags: true,
      style: {
        bg: 'black',
        fg: 'gray',
        border: {
          fg: 'gray',
        },
      },
      border: {
        type: 'line' as const,
        fg: 8, // gray
      },
    });

    // Add to screen
    this.screen.append(this.headerBox);
    this.screen.append(this.progressBox);
    this.screen.append(this.tasksBox);
    this.screen.append(this.logsBox);
    this.screen.append(this.statusBar);

    this.screen.render();
  }

  private setupEventHandlers(): void {
    // Exit on F10 or Ctrl+C
    this.screen.key(['f10', 'C-c'], async () => {
      await this.stop();
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
            onTasksReloaded: (tasks) => {
              // Update tasks list with the ones agent loaded
              this.tasks = tasks;
              this.logActivity(
                'info',
                `[DEBUG] Watcher updated with ${tasks.length} tasks from agent`
              );
              if (tasks.length > 0) {
                this.logActivity(
                  'info',
                  `[DEBUG] First task: ${tasks[0].id} - ${tasks[0].title.substring(0, 50)}`
                );
              }
              this.render();
            },
            onTaskStatusChange: async (taskId, status) => {
              // Update task locally (don't reload from disk since changes aren't saved there yet)
              const task = this.tasks.find((t) => t.id === taskId);

              // Debug log
              this.logActivity('info', `🔄 Status change: ${taskId.slice(0, 8)}... -> ${status}`);
              this.logActivity('info', `[DEBUG] Before update: ${this.tasks.length} tasks, ${this.history.length} completed`);

              if (task) {
                // Update task status
                task.status = status as OpenSpecTask['status'];

                // Update metadata
                if (status === 'in-progress') {
                  if (!task.metadata) task.metadata = {};
                  task.metadata.startedAt = new Date().toISOString();
                  this.logActivity('info', `▶️  Task started: ${task.title}`);
                } else if (status === 'completed') {
                  // Add to history before removing from active list
                  task.completedAt = new Date().toISOString();
                  this.history.push(task);

                  // Remove completed task from active list
                  this.tasks = this.tasks.filter((t) => t.id !== taskId);
                  this.logActivity('success', `✅ Task completed: ${task.title}`);
                  this.logActivity('info', `[DEBUG] After update: ${this.tasks.length} tasks, ${this.history.length} completed`);
                } else if (status === 'failed') {
                  this.logActivity('error', `❌ Task failed: ${task.title}`);
                }

                // Force render to show changes
                this.render();
              } else {
                this.logActivity('warning', `⚠️  Task ${taskId.slice(0, 8)}... not found in list`);
              }
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
    this.statusBar.setContent(
      ` Press F10 or Ctrl+C to exit | Press A to start agent | Press R to refresh ${agentStatus}`
    );
    this.screen.render();
  }

  /**
   * Refresh tasks from OpenSpec
   */
  private async refreshTasks(): Promise<void> {
    try {
      const data = await this.openspecManager.loadOpenSpec();
      this.tasks = data.tasks;
      this.history = data.history;
      
      // Debug: Log refresh results
      const progress = this.getProgressInfo();
      this.logActivity(
        'info',
        `[DEBUG] Refreshed: ${this.tasks.length} active, ${this.history.length} completed, ${progress.percentage}%`
      );
      
      this.render();
    } catch (error) {
      this.logActivity('error', `Failed to refresh tasks: ${error}`);
    }
  }

  /**
   * Get progress information
   */
  private getProgressInfo(): {
    completed: number;
    total: number;
    percentage: number;
    color: string;
  } {
    // Include history in progress calculation
    const allTasks = [...this.tasks, ...this.history];
    const completed = this.history.length; // History contains all completed tasks
    const total = allTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Color based on progress
    let color = 'green';
    if (percentage < 50) color = 'red';
    else if (percentage < 75) color = 'yellow';

    return { completed, total, percentage, color };
  }



  /**
   * Render progress bar (optimized to only update when progress changes)
   */
  private renderProgressBar(): void {
    const progressInfo = this.getProgressInfo();
    
    // Only update if progress has actually changed
    if (
      progressInfo.completed === this.lastProgressInfo.completed &&
      progressInfo.total === this.lastProgressInfo.total &&
      progressInfo.percentage === this.lastProgressInfo.percentage
    ) {
      return;
    }

    this.lastProgressInfo = { ...progressInfo };
    const { completed, total, percentage } = progressInfo;

    // Create custom progress bar using text
    const barWidth = 40;
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;
    
    const filledBar = '█'.repeat(filledWidth);
    const emptyBar = '░'.repeat(emptyWidth);
    const progressBarContent = filledBar + emptyBar;

    // Update progress bar content
    this.progressBar.setContent(progressBarContent);

    // Update style based on progress
    if (percentage < 50) {
      this.progressBar.style.fg = 'red';
    } else if (percentage < 75) {
      this.progressBar.style.fg = 'yellow';
    } else {
      this.progressBar.style.fg = 'green';
    }

    // Update progress details label - ensure valid values
    const safePercentage = Math.max(0, Math.min(100, percentage));
    const details = `{bold}{white-fg}${safePercentage}%{/} - {gray-fg}${completed}/{/}{white-fg}${total}{/} completed - {yellow-fg}${Math.max(0, total - completed)}{/} remaining`;
    const progressLabel = (this as any).progressLabel;
    if (progressLabel) {
      progressLabel.setContent(details);
    }
  }



  /**
   * Render active tasks (optimized to only update when task count changes)
   */
  private renderActiveTasks(): void {
    // Only update if task count has changed
    if (this.tasks.length === this.lastTaskCount) {
      return;
    }

    this.lastTaskCount = this.tasks.length;

    if (this.tasks.length === 0) {
      this.tasksBox.setContent('\n  {gray-fg}No active tasks{/gray-fg}');
      return;
    }

    // Calculate how many tasks fit in the box (height - 2 for padding)
    const boxHeight = this.tasksBox.height;
    const maxTasks = typeof boxHeight === 'number' ? Math.max(5, boxHeight - 2) : 10;

    // Get terminal width to truncate long task titles
    const termWidth = typeof this.screen.width === 'number' ? this.screen.width : 80;
    const maxTitleWidth = termWidth - 20; // Reserve space for status and ID

    const lines = this.tasks
      .slice(0, maxTasks) // Show only what fits
      .map((task) => {
        const statusIcon = task.status === 'in-progress' ? '{yellow-fg}▶{/}' : '{blue-fg}○{/}';
        const taskId = task.id.slice(0, 8);
        
        // Truncate title if too long
        let title = task.title;
        if (title.length > maxTitleWidth) {
          title = title.substring(0, maxTitleWidth - 3) + '...';
        }

        return `{cyan-fg}${statusIcon}{/} {white-fg}${taskId}{/} - {gray-fg}${title}{/}`;
      });

    this.tasksBox.setContent(lines.join('\n'));

    // Auto-scroll to top
    this.tasksBox.setScrollPerc(0);
  }

  /**
   * Render activity logs (optimized to only update when new logs are added)
   */
  private renderActivityLogs(): void {
    // Only update if log count has changed
    if (this.activityLogs.length === this.lastActivityLogCount) {
      return;
    }

    this.lastActivityLogCount = this.activityLogs.length;

    if (this.activityLogs.length === 0) {
      this.logsBox.setContent('\n  {gray-fg}No activity yet{/gray-fg}');
      return;
    }

    const LOG_ICONS = {
      success: '{green-fg}✓{/}',
      info: '{blue-fg}i{/}',
      warning: '{yellow-fg}!{/}',
      error: '{red-fg}✗{/}',
      tool: '{cyan-fg}›{/}',
    };

    // Calculate how many logs fit in the box (height - 2 for padding)
    const boxHeight = this.logsBox.height;
    const maxLogs = typeof boxHeight === 'number' ? Math.max(10, boxHeight - 2) : 20;

    // Get terminal width to truncate long messages
    const termWidth = typeof this.screen.width === 'number' ? this.screen.width : 80;
    const maxMessageWidth = termWidth - 15; // Reserve space for timestamp and icon

    const lines = this.activityLogs
      .slice(-maxLogs) // Show only what fits
      .map((entry) => {
        const time = entry.timestamp.toLocaleTimeString('en-US', { hour12: false });
        const icon = LOG_ICONS[entry.type];

        // Truncate message if too long
        let message = entry.message;
        if (message.length > maxMessageWidth) {
          message = message.substring(0, maxMessageWidth - 3) + '...';
        }

        return `{gray-fg}[${time}]{/} ${icon} ${message}`;
      });

    this.logsBox.setContent(lines.join('\n'));

    // Auto-scroll to bottom
    this.logsBox.setScrollPerc(100);
  }

  /**
   * Log activity (with memory optimization)
   */
  public logActivity(type: ActivityLogEntry['type'], message: string): void {
    this.activityLogs.push({
      timestamp: new Date(),
      type,
      message,
    });

    // Keep only last 100 entries in memory to prevent memory leaks
    if (this.activityLogs.length > 100) {
      this.activityLogs = this.activityLogs.slice(-100);
    }

    // Check memory usage periodically
    if (this.activityLogs.length % 50 === 0) {
      this.checkMemoryUsage();
    }

    this.render();
  }

  /**
   * Check memory usage and log warning if too high
   */
  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    if (memUsageMB > 10) {
      this.logActivity('warning', `High memory usage: ${memUsageMB}MB`);
    }
  }

  /**
   * Mark task as completed and remove from list
   */
  public markTaskCompleted(taskId: string): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'completed';
      this.logActivity('success', `Task completed: ${task.title}`);

      // Remove from active tasks
      this.tasks = this.tasks.filter((t) => t.id !== taskId);

      this.render();
    }
  }

  /**
   * Mark task as in progress
   */
  public markTaskInProgress(taskId: string): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = 'in-progress';
      if (!task.metadata) task.metadata = {};
      task.metadata.startedAt = new Date().toISOString();

      this.logActivity('info', `Task started: ${task.title}`);
      this.render();
    }
  }

  /**
   * Throttled render method for performance optimization
   */
  private render(): void {
    const now = Date.now();
    
    // Throttle renders to avoid excessive screen updates
    if (now - this.lastRenderTime < this.renderThrottleMs) {
      if (!this.pendingRender) {
        this.pendingRender = true;
        setTimeout(() => {
          this.pendingRender = false;
          this.forceRender();
        }, this.renderThrottleMs - (now - this.lastRenderTime));
      }
      return;
    }

    this.forceRender();
  }

  /**
   * Force render all components (internal method)
   */
  private forceRender(): void {
    this.lastRenderTime = Date.now();
    
    // Only update components that have changed
    this.renderProgressBar();
    this.renderActiveTasks();
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
      this.history = data.history;

      // Debug: Log loaded task IDs
      this.logActivity(
        'info',
        `[DEBUG] Loaded ${this.tasks.length} active tasks and ${this.history.length} completed`
      );
      this.tasks.slice(0, 3).forEach((t) => {
        this.logActivity('info', `  - ${t.id} (${t.status}): ${t.title.substring(0, 50)}`);
      });

      this.logActivity('info', 'Watcher started');
      this.updateStatusBar();
      this.render();
    } catch (error) {
      this.logActivity('error', `Failed to start: ${error}`);
      throw error;
    }
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logActivity('info', 'Stopping watcher...');

    // Stop agent first if running
    if (this.isAgentRunning && this.agentManager) {
      this.logActivity('info', 'Stopping agent...');
      try {
        await this.agentManager.stop();
        this.logActivity('success', 'Agent stopped');
      } catch (error) {
        this.logActivity('error', `Failed to stop agent: ${error}`);
      }
    }

    this.isRunning = false;

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
