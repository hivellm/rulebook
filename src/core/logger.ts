import { writeFile, existsSync, mkdirSync, readdir, unlink } from 'fs';
import { promisify } from 'util';
import { join } from 'path';
import type { LogEntry } from '../types.js';

const writeFileAsync = promisify(writeFile);
const readdirAsync = promisify(readdir);
const unlinkAsync = promisify(unlink);

const LOGS_DIR = '.rulebook/logs';
const MAX_LOG_AGE_DAYS = 30;

export class Logger {
  private logsPath: string;
  private currentLogFile: string;
  private logBuffer: LogEntry[] = [];
  private bufferSize = 10;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(projectRoot: string) {
    this.logsPath = join(projectRoot, LOGS_DIR);
    this.currentLogFile = join(this.logsPath, this.generateLogFileName());
    this.initializeLogging();
  }

  /**
   * Initialize logging directory and start flush interval
   */
  private async initializeLogging(): Promise<void> {
    if (!existsSync(this.logsPath)) {
      mkdirSync(this.logsPath, { recursive: true });
    }

    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000); // Flush every 5 seconds

    // Clean old logs on startup
    await this.cleanOldLogs();
  }

  /**
   * Generate log file name with timestamp
   */
  private generateLogFileName(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `agent-${timestamp}.log`;
  }

  /**
   * Log a message
   */
  log(
    level: LogEntry['level'],
    message: string,
    context?: Record<string, unknown>,
    taskId?: string,
    duration?: number
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      taskId,
      duration,
    };

    this.logBuffer.push(entry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>, taskId?: string): void {
    this.log('debug', message, context, taskId);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>, taskId?: string): void {
    this.log('info', message, context, taskId);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>, taskId?: string): void {
    this.log('warn', message, context, taskId);
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, unknown>, taskId?: string): void {
    this.log('error', message, context, taskId);
  }

  /**
   * Log task start
   */
  taskStart(taskId: string, taskTitle: string): void {
    this.info(`Task started: ${taskTitle}`, { taskId, action: 'start' }, taskId);
  }

  /**
   * Log task completion
   */
  taskComplete(taskId: string, taskTitle: string, duration: number): void {
    this.info(`Task completed: ${taskTitle}`, { taskId, action: 'complete', duration }, taskId);
  }

  /**
   * Log task failure
   */
  taskFailed(taskId: string, taskTitle: string, error: string, duration?: number): void {
    this.error(`Task failed: ${taskTitle}`, { taskId, action: 'failed', error, duration }, taskId);
  }

  /**
   * Log CLI command execution
   */
  cliCommand(command: string, tool: string, taskId?: string): void {
    this.debug(`CLI command: ${command}`, { tool, command }, taskId);
  }

  /**
   * Log CLI response
   */
  cliResponse(tool: string, response: string, duration: number, taskId?: string): void {
    this.debug(
      `CLI response from ${tool}`,
      { tool, responseLength: response.length, duration },
      taskId
    );
  }

  /**
   * Log test execution
   */
  testExecution(
    testType: string,
    result: 'passed' | 'failed',
    duration: number,
    taskId?: string
  ): void {
    this.info(`Test ${testType}: ${result}`, { testType, result, duration }, taskId);
  }

  /**
   * Log coverage check
   */
  coverageCheck(percentage: number, threshold: number, taskId?: string): void {
    const status = percentage >= threshold ? 'passed' : 'failed';
    this.info(`Coverage check: ${status}`, { percentage, threshold, status }, taskId);
  }

  /**
   * Flush log buffer to file
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    try {
      const entries = [...this.logBuffer];
      this.logBuffer = [];

      const logContent = entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n';
      await writeFileAsync(this.currentLogFile, logContent, { flag: 'a' });
    } catch (error) {
      console.error('Failed to flush logs:', error);
    }
  }

  /**
   * Force flush and close logger
   */
  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    await this.flush();
  }

  /**
   * Clean old log files
   */
  private async cleanOldLogs(): Promise<void> {
    try {
      const files = await readdirAsync(this.logsPath);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - MAX_LOG_AGE_DAYS);

      for (const file of files) {
        if (file.startsWith('agent-') && file.endsWith('.log')) {
          const filePath = join(this.logsPath, file);
          const stats = await import('fs').then((fs) => fs.promises.stat(filePath));

          if (stats.mtime < cutoffDate) {
            await unlinkAsync(filePath);
            this.info(`Cleaned old log file: ${file}`);
          }
        }
      }
    } catch (error) {
      this.error('Failed to clean old logs', { error: String(error) });
    }
  }

  /**
   * Get recent log entries
   */
  async getRecentLogs(limit: number = 100): Promise<LogEntry[]> {
    try {
      const files = await readdirAsync(this.logsPath);
      const logFiles = files
        .filter((file) => file.startsWith('agent-') && file.endsWith('.log'))
        .sort()
        .reverse(); // Most recent first

      const entries: LogEntry[] = [];

      for (const file of logFiles) {
        if (entries.length >= limit) break;

        const filePath = join(this.logsPath, file);
        const content = await import('fs').then((fs) => fs.promises.readFile(filePath, 'utf-8'));

        const lines = content
          .trim()
          .split('\n')
          .filter((line) => line.trim());
        for (const line of lines) {
          if (entries.length >= limit) break;
          try {
            const entry = JSON.parse(line) as LogEntry;
            entries.push(entry);
          } catch {
            // Skip malformed entries
          }
        }
      }

      return entries.slice(0, limit);
    } catch (error) {
      this.error('Failed to get recent logs', { error: String(error) });
      return [];
    }
  }

  /**
   * Get logs for specific task
   */
  async getTaskLogs(taskId: string): Promise<LogEntry[]> {
    const recentLogs = await this.getRecentLogs(1000);
    return recentLogs.filter((entry) => entry.taskId === taskId);
  }

  /**
   * Get logs by level
   */
  async getLogsByLevel(level: LogEntry['level'], limit: number = 100): Promise<LogEntry[]> {
    const recentLogs = await this.getRecentLogs(limit * 2);
    return recentLogs.filter((entry) => entry.level === level).slice(0, limit);
  }

  /**
   * Get error logs
   */
  async getErrorLogs(limit: number = 50): Promise<LogEntry[]> {
    return this.getLogsByLevel('error', limit);
  }

  /**
   * Generate log summary
   */
  async getLogSummary(): Promise<{
    totalEntries: number;
    byLevel: Record<string, number>;
    recentErrors: number;
    oldestEntry?: string;
    newestEntry?: string;
  }> {
    const recentLogs = await this.getRecentLogs(1000);

    const summary = {
      totalEntries: recentLogs.length,
      byLevel: {} as Record<string, number>,
      recentErrors: 0,
      oldestEntry: undefined as string | undefined,
      newestEntry: undefined as string | undefined,
    };

    for (const entry of recentLogs) {
      summary.byLevel[entry.level] = (summary.byLevel[entry.level] || 0) + 1;

      if (entry.level === 'error') {
        summary.recentErrors++;
      }

      if (!summary.oldestEntry || entry.timestamp < summary.oldestEntry) {
        summary.oldestEntry = entry.timestamp;
      }

      if (!summary.newestEntry || entry.timestamp > summary.newestEntry) {
        summary.newestEntry = entry.timestamp;
      }
    }

    return summary;
  }
}

/**
 * Create a new Logger instance
 */
export function createLogger(projectRoot: string): Logger {
  return new Logger(projectRoot);
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Initialize global logger
 */
export function initializeLogger(projectRoot: string): Logger {
  globalLogger = new Logger(projectRoot);
  return globalLogger;
}

/**
 * Get global logger instance
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    throw new Error('Logger not initialized. Call initializeLogger() first.');
  }
  return globalLogger;
}
