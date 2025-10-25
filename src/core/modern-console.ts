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
  private progressBar!: blessed.Widgets.TextElement; // Custom progress bar using text element
  private progressBox!: blessed.Widgets.BoxElement;
  private logsBox!: blessed.Widgets.BoxElement;
  private statusBar!: blessed.Widgets.BoxElement;
  private progressLabel!: blessed.Widgets.TextElement;

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

  // Loading indicator
  private loadingFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentLoadingFrame = 0;
  private loadingInterval?: NodeJS.Timeout;

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
    // Get blessed screen dimensions (will be set after screen creation)
    const blessedHeight = typeof this.screen.height === 'number' ? this.screen.height : 0;

    // Use blessed dimensions if valid, otherwise fallback to process.stdout or defaults
    // Always use at least 24 lines for minimum usability, but don't throw error
    const finalHeight = Math.max(blessedHeight > 0 ? blessedHeight : process.stdout.rows || 24, 24);

    // Calculate layout dimensions - Simplified layout (fixed progress, remaining for logs)
    const headerHeight = 3;
    const statusHeight = 1;
    const availableHeight = finalHeight - headerHeight - statusHeight;

    // Fixed progress height, remaining for logs
    const progressHeight = 3; // Fixed compact height for progress

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
    this.progressLabel = progressLabel;

    // Activity Logs (remaining space after progress)
    this.logsBox = blessed.box({
      top: headerHeight + progressHeight,
      left: 0,
      width: '100%',
      height: availableHeight - progressHeight,
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
    this.screen.append(this.logsBox);
    this.screen.append(this.statusBar);

    this.screen.render();
  }

  private setupEventHandlers(): void {
    // Start loading animation
    this.startLoadingAnimation();

    // Exit on F10 or Ctrl+C
    this.screen.key(['f10', 'C-c'], async () => {
      this.stopLoadingAnimation();
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
              this.logActivity(
                'info',
                `[DEBUG] Before update: ${this.tasks.length} tasks, ${this.history.length} completed`
              );

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
                  this.logActivity(
                    'info',
                    `[DEBUG] After update: ${this.tasks.length} tasks, ${this.history.length} completed`
                  );
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

    // Render progress bar manually using text widget
    const barWidth = 40;
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;

    const filledBar = '█'.repeat(filledWidth);
    const emptyBar = '░'.repeat(emptyWidth);

    // Update style based on progress
    let color = 'green';
    if (percentage < 50) {
      color = 'red';
    } else if (percentage < 75) {
      color = 'yellow';
    }

    this.progressBar.style.fg = color;
    this.progressBar.setContent(`{${color}-fg}${filledBar}${emptyBar}{/}`);

    // Update progress details label - ensure valid values
    const safePercentage = Math.max(0, Math.min(100, percentage));
    const details = `{bold}{white-fg}${safePercentage}%{/} - {gray-fg}${completed}/{/}{white-fg}${total}{/} completed - {yellow-fg}${Math.max(0, total - completed)}{/} remaining`;
    if (this.progressLabel) {
      this.progressLabel.setContent(details);
    }
  }

  /**
   * Render activity logs (always render to animate spinner)
   */
  private renderActivityLogs(): void {
    // Always render - needed for loading spinner animation

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

    // Add loading indicator to the last log if agent is running
    const visibleLogs = this.activityLogs.slice(-maxLogs);
    const lines = visibleLogs.map((entry, index) => {
      const time = entry.timestamp.toLocaleTimeString('en-US', { hour12: false });
      let icon = LOG_ICONS[entry.type];

      // Truncate message if too long
      let message = entry.message;
      if (message.length > maxMessageWidth) {
        message = message.substring(0, maxMessageWidth - 3) + '...';
      }

      // Add loading spinner to the last log entry if agent is running and it's a tool operation
      const isLastLog = index === visibleLogs.length - 1;
      if (isLastLog && this.isAgentRunning && entry.type === 'tool') {
        // Show animated spinner
        const loadingSpinner = this.loadingFrames[this.currentLoadingFrame];
        icon = `{yellow-fg}${loadingSpinner}{/}`;
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
   * Start loading animation
   */
  private startLoadingAnimation(): void {
    this.loadingInterval = setInterval(() => {
      this.currentLoadingFrame = (this.currentLoadingFrame + 1) % this.loadingFrames.length;
      // Force re-render to animate the spinner
      if (this.isAgentRunning) {
        this.forceRender();
      }
    }, 100); // Update every 100ms for smooth animation
  }

  /**
   * Stop loading animation
   */
  private stopLoadingAnimation(): void {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = undefined;
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
        setTimeout(
          () => {
            this.pendingRender = false;
            this.forceRender();
          },
          this.renderThrottleMs - (now - this.lastRenderTime)
        );
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
