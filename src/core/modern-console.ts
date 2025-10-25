import blessed from 'blessed';
import { createOpenSpecManager } from './openspec-manager.js';
import type { OpenSpecTask } from '../types.js';

export interface ModernConsoleOptions {
  projectRoot: string;
  refreshInterval?: number;
  showSystemInfo?: boolean;
  showLogs?: boolean;
  maxLogLines?: number;
}

export class ModernConsole {
  private screen: blessed.Widgets.Screen;
  private openspecManager: ReturnType<typeof createOpenSpecManager>;
  private options: ModernConsoleOptions;
  private isRunning = false;
  private refreshTimer?: NodeJS.Timeout;
  
  // UI Components
  private headerBox!: blessed.Widgets.BoxElement;
  private tasksBox!: blessed.Widgets.ListElement;
  private detailsBox!: blessed.Widgets.BoxElement;
  private logsBox!: blessed.Widgets.BoxElement;
  private systemBox!: blessed.Widgets.BoxElement;
  private statusBar!: blessed.Widgets.BoxElement;

  constructor(options: ModernConsoleOptions) {
    this.options = {
      refreshInterval: 2000,
      showSystemInfo: true,
      showLogs: true,
      maxLogLines: 50,
      ...options
    };

    this.openspecManager = createOpenSpecManager(options.projectRoot);
    
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Rulebook Watcher - Modern Console',
      fullUnicode: true,
      dockBorders: true,
      autoPadding: true,
      warnings: false
    });

    this.setupUI();
    this.setupEventHandlers();
  }

  private setupUI(): void {
    // Header
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: this.getHeaderContent(),
      tags: true,
      style: {
        bg: 'blue',
        fg: 'white',
        bold: true
      },
      border: {
        type: 'line',
        fg: 4 // blue
      }
    });

    // Tasks List (left side)
    this.tasksBox = blessed.list({
      top: 3,
      left: 0,
      width: '50%',
      height: '60%',
      label: ' {bold}OpenSpec Tasks{/bold} ',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      style: {
        selected: {
          bg: 'green',
          fg: 'black'
        },
        item: {
          fg: 'white'
        }
      },
      border: {
        type: 'line',
        fg: 6 // cyan
      },
      scrollbar: {
        ch: ' ',
        track: {
          bg: 'cyan'
        },
        style: {
          inverse: true
        }
      }
    });

    // Task Details (right side)
    this.detailsBox = blessed.box({
      top: 3,
      right: 0,
      width: '50%',
      height: '60%',
      label: ' {bold}Task Details{/bold} ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      style: {
        bg: 'black',
        fg: 'white'
      },
      border: {
        type: 'line',
        fg: 6 // cyan
      },
      scrollbar: {
        ch: ' ',
        track: {
          bg: 'cyan'
        },
        style: {
          inverse: true
        }
      }
    });

    // System Info (bottom left)
    this.systemBox = blessed.box({
      top: '63%',
      left: 0,
      width: '50%',
      height: '37%',
      label: ' {bold}System Info{/bold} ',
      tags: true,
      style: {
        bg: 'black',
        fg: 'white'
      },
      border: {
        type: 'line',
        fg: 5 // magenta
      }
    });

    // Logs (bottom right)
    this.logsBox = blessed.log({
      top: '63%',
      right: 0,
      width: '50%',
      height: '37%',
      label: ' {bold}Activity Logs{/bold} ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      style: {
        bg: 'black',
        fg: 'white'
      },
      border: {
        type: 'line',
        fg: 5 // magenta
      },
      scrollbar: {
        ch: ' ',
        track: {
          bg: 'magenta'
        },
        style: {
          inverse: true
        }
      }
    });

    // Status Bar
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: 'Loading...',
      tags: true,
      style: {
        bg: 'green',
        fg: 'black',
        bold: true
      }
    });

    // Add all components to screen
    this.screen.append(this.headerBox);
    this.screen.append(this.tasksBox);
    this.screen.append(this.detailsBox);
    this.screen.append(this.systemBox);
    this.screen.append(this.logsBox);
    this.screen.append(this.statusBar);

    // Focus on tasks list
    this.tasksBox.focus();
  }

  private setupEventHandlers(): void {
    // Global key handlers
    this.screen.key(['q', 'C-c'], () => {
      this.stop();
    });

    this.screen.key(['F10'], () => {
      this.stop();
    });

    this.screen.key(['r'], () => {
      this.refresh();
    });

    this.screen.key(['h'], () => {
      this.showHelp();
    });

    // Task selection handler
    this.tasksBox.on('select', (item) => {
      this.showTaskDetails(item.content);
    });

    // Mouse support
    this.tasksBox.on('click', () => {
      this.tasksBox.focus();
    });
  }

  private getHeaderContent(): string {
    const now = new Date().toLocaleString();
    return `{center}{bold}Rulebook Watcher v0.10.0{/bold} - {bold}Modern Console{/bold} - {bold}${now}{/bold}{/center}`;
  }

  private async getStatusContent(): Promise<string> {
    const tasks = await this.getTasksSummary();
    return `Tasks: ${tasks.total} | Active: ${tasks.inProgress} | Completed: ${tasks.completed} | Failed: ${tasks.failed} | Press 'q' or 'Ctrl+C' to quit | 'r' to refresh | 'h' for help`;
  }

  private async getTasksSummary(): Promise<{ total: number; inProgress: number; completed: number; failed: number }> {
    try {
      const stats = await this.openspecManager.getTaskStats();
      return {
        total: stats.total,
        inProgress: stats.inProgress,
        completed: stats.completed,
        failed: stats.failed
      };
    } catch (error) {
      this.logError(`Failed to get task stats: ${error}`);
      return { total: 0, inProgress: 0, completed: 0, failed: 0 };
    }
  }

  private async loadTasks(): Promise<void> {
    try {
      const tasks = await this.openspecManager.getTasksByPriority();
      
      // Store current selection
      const currentSelection = 0; // TODO: Fix blessed ListElement selection tracking
      const currentItem = this.tasksBox.getItem(currentSelection);
      
      // Clear existing items
      this.tasksBox.clearItems();
      
      // Add tasks to list
      tasks.forEach(task => {
        const statusIcon = this.getStatusIcon(task.status);
        const priority = 'P'.repeat(task.priority);
        const item = `${statusIcon} ${priority} ${task.title}`;
        this.tasksBox.addItem(item);
      });

      // Restore selection if possible
      if (currentItem && currentSelection >= 0) {
        this.tasksBox.select(currentSelection);
      }

      // Update summary
      this.statusBar.setContent(await this.getStatusContent());
      
      this.screen.render();
    } catch (error) {
      this.logError(`Failed to load tasks: ${error}`);
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '{green-fg}✓{/green-fg}';
      case 'in-progress': return '{blue-fg}⚙{/blue-fg}';
      case 'failed': return '{red-fg}✗{/red-fg}';
      case 'skipped': return '{yellow-fg}⊘{/yellow-fg}';
      default: return '{white-fg}○{/white-fg}';
    }
  }

  private async showTaskDetails(taskItem: string): Promise<void> {
    try {
      // Extract task title from item
      const taskTitle = taskItem.replace(/^[^\s]+\s+[^\s]+\s+/, '');
      const tasks = await this.openspecManager.getTasksByPriority();
      const task = tasks.find(t => t.title === taskTitle);
      
      if (task) {
        const details = this.formatTaskDetails(task);
        this.detailsBox.setContent(details);
        this.screen.render();
      }
    } catch (error) {
      this.logError(`Failed to show task details: ${error}`);
    }
  }

  private formatTaskDetails(task: OpenSpecTask): string {
    const duration = task.actualTime ? `${task.actualTime}s` : 'N/A';
    const createdAt = new Date(task.createdAt).toLocaleString();
    const updatedAt = new Date(task.updatedAt).toLocaleString();
    
    return `{bold}${task.title}{/bold}

{cyan-fg}Description:{/cyan-fg}
${task.description}

{cyan-fg}Status:{/cyan-fg} ${this.getStatusIcon(task.status)} ${task.status}
{cyan-fg}Priority:{/cyan-fg} ${task.priority}
{cyan-fg}Attempts:{/cyan-fg} ${task.attempts}
{cyan-fg}Estimated Time:{/cyan-fg} ${task.estimatedTime}s
{cyan-fg}Actual Time:{/cyan-fg} ${duration}

{cyan-fg}Dependencies:{/cyan-fg}
${task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None'}

{cyan-fg}Tags:{/cyan-fg}
${task.tags.length > 0 ? task.tags.join(', ') : 'None'}

{cyan-fg}Created:{/cyan-fg} ${createdAt}
{cyan-fg}Updated:{/cyan-fg} ${updatedAt}

${task.completedAt ? `{cyan-fg}Completed:{/cyan-fg} ${new Date(task.completedAt).toLocaleString()}` : ''}`;
  }

  private async updateSystemInfo(): Promise<void> {
    if (!this.options.showSystemInfo) return;

    try {
      const os = await import('os');
      // const memUsage = process.memoryUsage();
      // const cpuUsage = process.cpuUsage();
      
      const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
      const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024);
      const usedMem = totalMem - freeMem;
      const memPercent = Math.round((usedMem / totalMem) * 100);
      
      const content = `{bold}System Information{/bold}

{cyan-fg}Memory:{/cyan-fg}
  Total: ${totalMem}GB
  Used: ${usedMem}GB (${memPercent}%)
  Free: ${freeMem}GB

{cyan-fg}Process:{/cyan-fg}
  PID: ${process.pid}
  Uptime: ${Math.round(process.uptime())}s
  Node.js: ${process.version}

{cyan-fg}CPU:{/cyan-fg}
  Cores: ${os.cpus().length}
  Arch: ${os.arch()}
  Platform: ${os.platform()}

{cyan-fg}Load Average:{/cyan-fg}
  ${os.loadavg().map(load => load.toFixed(2)).join(', ')}`;

      this.systemBox.setContent(content);
      this.screen.render();
    } catch (error) {
      this.logError(`Failed to update system info: ${error}`);
    }
  }

  private logInfo(message: string): void {
    if (this.options.showLogs) {
      const timestamp = new Date().toLocaleTimeString();
      this.logsBox.setContent(this.logsBox.content + `\n{green-fg}[INFO]{/green-fg} ${timestamp}: ${message}`);
    }
  }

  private logError(message: string): void {
    if (this.options.showLogs) {
      const timestamp = new Date().toLocaleTimeString();
      this.logsBox.setContent(this.logsBox.content + `\n{red-fg}[ERROR]{/red-fg} ${timestamp}: ${message}`);
    }
  }

  // private logWarn(message: string): void {
  //   if (this.options.showLogs) {
  //     const timestamp = new Date().toLocaleTimeString();
  //     this.logsBox.log(`{yellow-fg}[WARN]{/yellow-fg} ${timestamp}: ${message}`);
  //   }
  // }

  private showHelp(): void {
    const helpContent = `{bold}Rulebook Watcher - Help{/bold}

{cyan-fg}Navigation:{/cyan-fg}
  ↑/↓     - Navigate tasks
  Enter   - Show task details
  Tab     - Switch between panels

{cyan-fg}Commands:{/cyan-fg}
  q/Ctrl+C - Quit watcher
  F10     - Quit watcher
  r       - Refresh data
  h       - Show this help

{cyan-fg}Panels:{/cyan-fg}
  Tasks List    - Shows all OpenSpec tasks
  Task Details  - Detailed task information
  System Info   - System resource usage
  Activity Logs - Real-time activity log

{cyan-fg}Auto-refresh:{/cyan-fg} Every ${this.options.refreshInterval}ms`;

    this.detailsBox.setContent(helpContent);
    this.screen.render();
  }

  private async refresh(): Promise<void> {
    try {
      await this.loadTasks();
      await this.updateSystemInfo();
    } catch (error) {
      this.logError(`Refresh failed: ${error}`);
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.logInfo('Starting Rulebook Watcher...');
    
    // Initial load
    await this.refresh();
    
    // Setup auto-refresh
    this.refreshTimer = setInterval(async () => {
      if (this.isRunning) {
        await this.refresh();
      }
    }, this.options.refreshInterval);
    
    this.logInfo('Watcher started successfully');
    this.screen.render();
  }

  public stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    
    this.logInfo('Stopping watcher...');
    this.screen.destroy();
    process.exit(0);
  }
}

export function createModernConsole(options: ModernConsoleOptions): ModernConsole {
  return new ModernConsole(options);
}

export async function startModernWatcher(projectRoot: string): Promise<void> {
  const console = createModernConsole({
    projectRoot,
    refreshInterval: 2000,
    showSystemInfo: true,
    showLogs: true,
    maxLogLines: 50
  });

  await console.start();
}
