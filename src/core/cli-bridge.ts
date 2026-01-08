import { spawn, type ChildProcess } from 'child_process';
import { createLogger } from './logger.js';
import type { RulebookConfig } from '../types.js';
import { CursorAgentStreamParser, parseStreamLine } from '../agents/cursor-agent.js';
import { ClaudeCodeStreamParser, parseClaudeCodeLine } from '../agents/claude-code.js';
import { GeminiStreamParser, parseGeminiLine } from '../agents/gemini-cli.js';
import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface CLITool {
  name: string;
  command: string;
  version?: string;
  available: boolean;
}

export interface CLIResponse {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  exitCode: number;
}

export class CLIBridge {
  private logger: ReturnType<typeof createLogger>;
  private config: RulebookConfig;
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private onLog?: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  private debugLogFile?: string;
  private debugLogInitialized = false;

  constructor(logger: ReturnType<typeof createLogger>, config: RulebookConfig) {
    this.logger = logger;
    this.config = config;
  }

  /**
   * Initialize debug logging (called once after singleton creation)
   */
  private initializeDebugLog(): void {
    if (this.debugLogInitialized) {
      return;
    }

    this.debugLogInitialized = true;

    // Skip debug logging during tests
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      return;
    }

    // Create logs directory if it doesn't exist
    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) {
      mkdir(logsDir, { recursive: true }).catch(() => {
        // Ignore mkdir errors
      });
    }
    // Create debug log file with timestamp in logs directory
    const logTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    this.debugLogFile = join(logsDir, `debug-agent-${logTimestamp}.log`);
    this.debugLog(`=== DEBUG LOG START ===`);
    this.debugLog(`Session started at: ${new Date().toISOString()}`);
    this.debugLog(`Working directory: ${process.cwd()}`);
    this.debugLog(`Node version: ${process.version}`);
    this.debugLog(`Platform: ${process.platform}`);
  }

  /**
   * Write to debug log file
   */
  private async debugLog(message: string): Promise<void> {
    if (!this.debugLogFile) return;
    try {
      const timestamp = new Date().toISOString();
      await appendFile(this.debugLogFile, `[${timestamp}] ${message}\n`);
    } catch {
      // Ignore errors in debug logging
    }
  }

  /**
   * Set callback for logging (used by watcher UI)
   */
  setLogCallback(
    callback: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void
  ): void {
    this.onLog = callback;
  }

  /**
   * Detect available CLI tools
   */
  async detectCLITools(): Promise<CLITool[]> {
    this.initializeDebugLog(); // Initialize debug log on first real use

    const tools: CLITool[] = [
      { name: 'cursor-agent', command: 'cursor-agent', available: false },
      // { name: 'claude-code', command: 'claude', available: false }, // Temporarily disabled for v0.10.0
      // { name: 'gemini-cli', command: 'gemini', available: false }, // Temporarily disabled for v0.10.0
    ];

    for (const tool of tools) {
      try {
        const proc = spawn(tool.command, ['--version']);

        let stdout = '';
        if (proc.stdout) {
          proc.stdout.setEncoding('utf8');
          proc.stdout.on('data', (data: string) => {
            stdout += data;
          });
        }

        const exitCode = await new Promise<number>((resolve, reject) => {
          const timeout = setTimeout(() => {
            proc.kill('SIGTERM');
            reject(new Error('Timeout'));
          }, 5000);

          proc.on('exit', (code: number | null) => {
            clearTimeout(timeout);
            resolve(code ?? 1);
          });
          proc.on('error', (error: Error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        if (exitCode === 0) {
          tool.available = true;
          tool.version = stdout.trim();
          this.logger.info(`Detected CLI tool: ${tool.name}`, { version: tool.version });
        }
      } catch (error) {
        this.logger.debug(`CLI tool not available: ${tool.name}`, { error: String(error) });
      }
    }

    return tools.filter((tool) => tool.available);
  }

  /**
   * Send command to CLI tool
   */
  async sendCommandToCLI(
    toolName: string,
    command: string,
    options: {
      timeout?: number;
      workingDirectory?: string;
      env?: Record<string, string>;
    } = {}
  ): Promise<CLIResponse> {
    const startTime = Date.now();

    // Check for deprecated tools
    const deprecatedTools = ['cursor-cli', 'claude-cli', 'gemini-cli-legacy'];
    if (deprecatedTools.includes(toolName)) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        output: '',
        error: `Tool '${toolName}' is deprecated and not supported. Please use 'cursor-agent', 'claude-code', or 'gemini-cli' instead.`,
        duration,
        exitCode: 1,
      };
    }

    // Check for supported tools
    const supportedTools = ['cursor-agent']; // Temporarily only cursor-agent for v0.10.0
    if (!supportedTools.includes(toolName)) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        output: '',
        error: `Tool '${toolName}' is not supported. Supported tools are: ${supportedTools.join(', ')}`,
        duration,
        exitCode: 1,
      };
    }

    // cursor-agent needs more time to connect to remote server and process
    // Set to 30 minutes for long-running tasks
    const defaultTimeout = toolName === 'cursor-agent' ? 1800000 : 30000; // 30 minutes for cursor-agent
    const timeout = options.timeout || this.config.timeouts?.cliResponse || defaultTimeout;

    this.logger.cliCommand(command, toolName);

    try {
      if (toolName === 'cursor-agent') {
        // cursor-agent expects: cursor-agent -p --force --approve-mcps --output-format stream-json --stream-partial-output "PROMPT"
        // Using -p (print mode) for non-interactive use with all tools enabled
        // --force: Allow commands unless explicitly denied
        // --approve-mcps: Allow all MCP servers without asking
        // --output-format stream-json: Stream output in JSON format
        // --stream-partial-output: Stream partial output as individual text deltas

        const args = [
          '-p',
          '--force',
          '--approve-mcps',
          '--output-format',
          'stream-json',
          '--stream-partial-output',
          command,
        ];

        await this.debugLog(`\n=== CURSOR-AGENT COMMAND START ===`);
        await this.debugLog(`Command: ${command}`);
        await this.debugLog(`Full command line: cursor-agent ${args.join(' ')}`);
        await this.debugLog(`Timestamp: ${new Date().toISOString()}`);
        await this.debugLog(`===================================\n`);

        const proc = spawn(toolName, args, {
          cwd: options.workingDirectory,
          env: {
            ...process.env,
            ...options.env,
            // Disable Node.js buffering for immediate output
            NODE_NO_READLINE: '1',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: false,
        });

        if (this.onLog) {
          this.onLog('info', '🔗 Connecting to cursor-agent...');
          this.onLog('info', '   (This may take 30-60 seconds to connect to remote server)');
        } else {
          console.log('🔗 Connecting to cursor-agent...');
          console.log('   (This may take 30-60 seconds to connect to remote server)');
        }

        // Progress indicator (silent in watcher mode)
        let dots = 0;
        const progressInterval = setInterval(() => {
          dots = (dots + 1) % 4;
          if (!this.onLog) {
            process.stdout.write('\r⏳ Waiting' + '.'.repeat(dots) + ' '.repeat(3 - dots));
          }
        }, 500);

        // Stream output in real-time with parser
        let hasOutput = false;
        let stdout = '';
        let stderr = '';
        const parser = new CursorAgentStreamParser();

        // Promise to resolve when parser completes
        let resolveCompletion: (() => void) | undefined;
        const completionPromise = new Promise<void>((resolve) => {
          resolveCompletion = resolve;
        });

        // Set completion callback
        parser.onComplete(() => {
          // Silent completion - no debug logs
          if (resolveCompletion) {
            resolveCompletion();
          }
          // Give a small delay for any remaining output, then kill
          setTimeout(() => {
            if (!proc.killed) {
              proc.kill('SIGTERM');
            }
          }, 500);
        });

        // Set event callback to forward to onLog or console
        parser.onEvent((type, message) => {
          if (this.onLog) {
            // Watcher mode - send to UI
            const logType = type === 'completion' ? 'success' : 'info';
            this.onLog(logType, message);
          } else {
            // CLI mode - print to console with colors
            if (type === 'tool') {
              // Tool calls in cyan
              console.log(`   \x1b[36m${message}\x1b[0m`);
            } else if (type === 'text') {
              // Text generation in gray
              console.log(`   \x1b[90m${message}\x1b[0m`);
            } else if (type === 'completion') {
              // Completion in green
              console.log(`\n\x1b[32m${message}\x1b[0m`);
            }
          }
        });

        if (proc.stdout) {
          proc.stdout.setEncoding('utf8');

          let buffer = '';
          proc.stdout.on('data', (data: string) => {
            if (!hasOutput) {
              clearInterval(progressInterval);
              if (this.onLog) {
                this.onLog('success', '✅ Received first response from cursor-agent!');
              } else {
                console.log('\n✅ Received first response from cursor-agent!');
                console.log(''); // Empty line for better formatting
              }
              hasOutput = true;
              this.debugLog('First response received from cursor-agent');
            }

            stdout += data;
            buffer += data;

            // Log raw output to debug file
            this.debugLog(`STDOUT RAW: ${data}`);

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim()) {
                // Parse and process each JSON event
                this.debugLog(`STDOUT LINE: ${line}`);
                const event = parseStreamLine(line);
                if (event) {
                  this.debugLog(`EVENT PARSED: type=${event.type}`);
                  parser.processEvent(event);
                } else {
                  this.debugLog(`EVENT PARSE FAILED: ${line.substring(0, 100)}`);
                }
              }
            }
          });
        }

        if (proc.stderr) {
          proc.stderr.setEncoding('utf8');
          proc.stderr.on('data', (data: string) => {
            if (!hasOutput) {
              clearInterval(progressInterval);
              hasOutput = true;
            }
            stderr += data;
            // Only write to stderr in CLI mode, not watcher mode
            if (!this.onLog) {
              process.stderr.write('⚠️ ' + data);
            }
          });
        }

        // Store active process
        const processId = `${toolName}-${Date.now()}`;
        this.activeProcesses.set(processId, proc);

        // Wait for process to complete with timeout or completion
        const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
          (resolve, reject) => {
            const timeoutId = setTimeout(() => {
              proc.kill('SIGTERM');
              reject(new Error(`Command timed out after ${timeout} milliseconds`));
            }, timeout);

            // Resolve when parser detects completion
            completionPromise.then(async () => {
              await this.debugLog('Parser completion event received');
              await this.debugLog(
                `Process PID: ${proc.pid}, killed: ${proc.killed}, exitCode: ${proc.exitCode}`
              );
              clearInterval(progressInterval);
              clearTimeout(timeoutId);

              // FORCE KILL IMMEDIATELY after completion
              if (!proc.killed && proc.exitCode === null) {
                await this.debugLog(`Forcing process kill immediately after completion`);
                try {
                  proc.kill('SIGTERM');
                  // Give 100ms for graceful shutdown, then SIGKILL
                  setTimeout(() => {
                    if (!proc.killed && proc.exitCode === null) {
                      proc.kill('SIGKILL');
                    }
                  }, 100);
                } catch (error) {
                  await this.debugLog(`Error killing process: ${error}`);
                }
              }

              // Wait max 500ms for process to exit
              const checkExit = setInterval(async () => {
                if (proc.killed || proc.exitCode !== null) {
                  await this.debugLog(`Process exited with code: ${proc.exitCode}`);
                  clearInterval(checkExit);
                  resolve({ exitCode: proc.exitCode ?? 0, stdout, stderr });
                }
              }, 50);

              // Force resolve after 500ms
              setTimeout(async () => {
                clearInterval(checkExit);
                if (!proc.killed) {
                  await this.debugLog(`Process STILL alive after 500ms, forcing SIGKILL`);
                  try {
                    proc.kill('SIGKILL');
                  } catch (error) {
                    await this.debugLog(`Error force killing: ${error}`);
                  }
                }
                resolve({ exitCode: 0, stdout, stderr });
              }, 500);
            });

            proc.on('exit', async (code: number | null, signal: NodeJS.Signals | null) => {
              await this.debugLog(`Process 'exit' event: code=${code}, signal=${signal}`);
              clearInterval(progressInterval);
              clearTimeout(timeoutId);
              resolve({ exitCode: code ?? 0, stdout, stderr });
            });

            proc.on('error', async (error: Error) => {
              await this.debugLog(`Process 'error' event: ${error.message}`);
              clearInterval(progressInterval);
              clearTimeout(timeoutId);
              reject(error);
            });
          }
        );

        const duration = Date.now() - startTime;

        // Debug logging for cursor-agent completion
        await this.debugLog(`\n=== CURSOR-AGENT COMMAND END ===`);
        await this.debugLog(`Duration: ${duration}ms`);
        await this.debugLog(`Exit code: ${result.exitCode}`);
        await this.debugLog(`Total stdout length: ${stdout.length} chars`);
        await this.debugLog(`Total stderr length: ${stderr.length} chars`);
        await this.debugLog(`Parser completed: ${parser.isCompleted()}`);
        await this.debugLog(`Active processes remaining: ${this.activeProcesses.size}`);
        await this.debugLog(`=================================\n`);

        // Remove from active processes
        this.activeProcesses.delete(processId);

        // Get parsed result from stream parser
        const parsedResult = parser.getResult();

        const response: CLIResponse = {
          success: result.exitCode === 0,
          output: parsedResult.text || result.stdout, // Use parsed text if available
          error: result.stderr,
          duration,
          exitCode: result.exitCode,
        };

        // Log summary
        if (this.onLog) {
          this.onLog(
            'info',
            `Summary: ${parsedResult.text.length} chars, ${parsedResult.toolCalls.length} tools, ${Math.round(duration / 1000)}s`
          );
          this.onLog('info', `Debug log: ${this.debugLogFile}`);
        } else {
          console.log('\n📊 Summary:');
          console.log(`   Text generated: ${parsedResult.text.length} chars`);
          console.log(`   Tool calls: ${parsedResult.toolCalls.length}`);
          console.log(`   Duration: ${Math.round(duration / 1000)}s`);
        }

        this.logger.cliResponse(toolName, parsedResult.text || result.stdout, duration);

        return response;
      } else if (toolName === 'claude-code') {
        // claude-code expects: claude --headless "PROMPT"
        const args = ['--headless', command];

        const proc = spawn('claude', args, {
          cwd: options.workingDirectory,
          env: {
            ...process.env,
            ...options.env,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: false,
        });

        if (this.onLog) {
          this.onLog('info', '🔗 Connecting to claude-code...');
        } else {
          console.log('🔗 Connecting to claude-code...');
        }

        // Progress indicator (silent in watcher mode)
        let dots = 0;
        const progressInterval = setInterval(() => {
          dots = (dots + 1) % 4;
          if (!this.onLog) {
            process.stdout.write('\r⏳ Waiting' + '.'.repeat(dots) + ' '.repeat(3 - dots));
          }
        }, 500);

        // Stream output in real-time with parser
        let hasOutput = false;
        let stdout = '';
        let stderr = '';
        const parser = new ClaudeCodeStreamParser();

        // Promise to resolve when parser completes
        let resolveCompletion: (() => void) | undefined;
        const completionPromise = new Promise<void>((resolve) => {
          resolveCompletion = resolve;
        });

        // Set completion callback
        parser.onComplete(() => {
          console.log('\n✅ claude-code completed, terminating process...');
          if (resolveCompletion) {
            resolveCompletion();
          }
          // Give a small delay for any remaining output, then kill
          setTimeout(() => {
            if (!proc.killed) {
              proc.kill('SIGTERM');
            }
          }, 500);
        });

        if (proc.stdout) {
          proc.stdout.setEncoding('utf8');

          let buffer = '';
          proc.stdout.on('data', (data: string) => {
            if (!hasOutput) {
              clearInterval(progressInterval);
              console.log('\n✅ Received first response from claude-code!');
              console.log(''); // Empty line for better formatting
              hasOutput = true;
            }

            stdout += data;
            buffer += data;

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim()) {
                // Parse and process each line
                const event = parseClaudeCodeLine(line);
                if (event) {
                  parser.processEvent(event);

                  // Check if parser completed
                  if (parser.isCompleted()) {
                    console.log('✅ Parser reports completed!');
                  }
                }
              }
            }
          });
        }

        if (proc.stderr) {
          proc.stderr.setEncoding('utf8');
          proc.stderr.on('data', (data: string) => {
            if (!hasOutput) {
              clearInterval(progressInterval);
              hasOutput = true;
            }
            stderr += data;
            // Only write to stderr in CLI mode, not watcher mode
            if (!this.onLog) {
              process.stderr.write('⚠️ ' + data);
            }
          });
        }

        // Store active process
        const processId = `${toolName}-${Date.now()}`;
        this.activeProcesses.set(processId, proc);

        // Wait for process to complete with timeout or completion
        const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
          (resolve, reject) => {
            const timeoutId = setTimeout(() => {
              proc.kill('SIGTERM');
              reject(new Error(`Command timed out after ${timeout} milliseconds`));
            }, timeout);

            // Resolve when parser detects completion
            completionPromise.then(() => {
              console.log('✅ completionPromise resolved!');
              clearInterval(progressInterval);
              clearTimeout(timeoutId);
              // Process might still be alive, wait a bit for graceful exit
              const checkExit = setInterval(() => {
                if (proc.killed || proc.exitCode !== null) {
                  clearInterval(checkExit);
                  resolve({ exitCode: proc.exitCode ?? 0, stdout, stderr });
                }
              }, 100);

              // Force resolve after 2 seconds if still hanging
              setTimeout(() => {
                clearInterval(checkExit);
                if (!proc.killed) {
                  proc.kill('SIGKILL');
                }
                resolve({ exitCode: 0, stdout, stderr });
              }, 2000);
            });

            proc.on('exit', (code: number | null, _signal: NodeJS.Signals | null) => {
              clearInterval(progressInterval);
              clearTimeout(timeoutId);
              resolve({ exitCode: code ?? 0, stdout, stderr });
            });

            proc.on('error', (error: Error) => {
              clearInterval(progressInterval);
              clearTimeout(timeoutId);
              reject(error);
            });
          }
        );

        const duration = Date.now() - startTime;

        // Remove from active processes
        this.activeProcesses.delete(processId);

        // Get parsed result from stream parser
        const parsedResult = parser.getResult();

        const response: CLIResponse = {
          success: result.exitCode === 0,
          output: parsedResult.text || result.stdout, // Use parsed text if available
          error: result.stderr,
          duration,
          exitCode: result.exitCode,
        };

        // Log summary
        console.log('\n📊 Summary:');
        console.log(`   Text generated: ${parsedResult.text.length} chars`);
        console.log(`   Tool calls: ${parsedResult.toolCalls.length}`);
        console.log(`   Duration: ${Math.round(duration / 1000)}s`);

        this.logger.cliResponse(toolName, parsedResult.text || result.stdout, duration);

        return response;
      } else if (toolName === 'gemini-cli') {
        // gemini-cli expects: gemini "PROMPT"
        const args = [command];

        const proc = spawn('gemini', args, {
          cwd: options.workingDirectory,
          env: {
            ...process.env,
            ...options.env,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: false,
        });

        if (this.onLog) {
          this.onLog('info', '🔗 Connecting to gemini-cli...');
        } else {
          console.log('🔗 Connecting to gemini-cli...');
        }

        // Progress indicator (silent in watcher mode)
        let dots = 0;
        const progressInterval = setInterval(() => {
          dots = (dots + 1) % 4;
          if (!this.onLog) {
            process.stdout.write('\r⏳ Waiting' + '.'.repeat(dots) + ' '.repeat(3 - dots));
          }
        }, 500);

        // Stream output in real-time with parser
        let hasOutput = false;
        let stdout = '';
        let stderr = '';
        const parser = new GeminiStreamParser();

        // Promise to resolve when parser completes
        let resolveCompletion: (() => void) | undefined;
        const completionPromise = new Promise<void>((resolve) => {
          resolveCompletion = resolve;
        });

        // Set completion callback
        parser.onComplete(() => {
          console.log('\n✅ gemini-cli completed, terminating process...');
          if (resolveCompletion) {
            resolveCompletion();
          }
          // Give a small delay for any remaining output, then kill
          setTimeout(() => {
            if (!proc.killed) {
              proc.kill('SIGTERM');
            }
          }, 500);
        });

        if (proc.stdout) {
          proc.stdout.setEncoding('utf8');

          let buffer = '';
          proc.stdout.on('data', (data: string) => {
            if (!hasOutput) {
              clearInterval(progressInterval);
              console.log('\n✅ Received first response from gemini-cli!');
              console.log(''); // Empty line for better formatting
              hasOutput = true;
            }

            stdout += data;
            buffer += data;

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim()) {
                // Parse and process each line
                const event = parseGeminiLine(line);
                if (event) {
                  parser.processEvent(event);

                  // Check if parser completed
                  if (parser.isCompleted()) {
                    console.log('✅ Parser reports completed!');
                  }
                }
              }
            }
          });
        }

        if (proc.stderr) {
          proc.stderr.setEncoding('utf8');
          proc.stderr.on('data', (data: string) => {
            if (!hasOutput) {
              clearInterval(progressInterval);
              hasOutput = true;
            }
            stderr += data;
            // Only write to stderr in CLI mode, not watcher mode
            if (!this.onLog) {
              process.stderr.write('⚠️ ' + data);
            }
          });
        }

        // Store active process
        const processId = `${toolName}-${Date.now()}`;
        this.activeProcesses.set(processId, proc);

        // Wait for process to complete with timeout or completion
        const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
          (resolve, reject) => {
            const timeoutId = setTimeout(() => {
              proc.kill('SIGTERM');
              reject(new Error(`Command timed out after ${timeout} milliseconds`));
            }, timeout);

            // Resolve when parser detects completion
            completionPromise.then(() => {
              console.log('✅ completionPromise resolved!');
              clearInterval(progressInterval);
              clearTimeout(timeoutId);
              // Process might still be alive, wait a bit for graceful exit
              const checkExit = setInterval(() => {
                if (proc.killed || proc.exitCode !== null) {
                  clearInterval(checkExit);
                  resolve({ exitCode: proc.exitCode ?? 0, stdout, stderr });
                }
              }, 100);

              // Force resolve after 2 seconds if still hanging
              setTimeout(() => {
                clearInterval(checkExit);
                if (!proc.killed) {
                  proc.kill('SIGKILL');
                }
                resolve({ exitCode: 0, stdout, stderr });
              }, 2000);
            });

            proc.on('exit', (code: number | null, _signal: NodeJS.Signals | null) => {
              clearInterval(progressInterval);
              clearTimeout(timeoutId);
              resolve({ exitCode: code ?? 0, stdout, stderr });
            });

            proc.on('error', (error: Error) => {
              clearInterval(progressInterval);
              clearTimeout(timeoutId);
              reject(error);
            });
          }
        );

        const duration = Date.now() - startTime;

        // Remove from active processes
        this.activeProcesses.delete(processId);

        // Get parsed result from stream parser
        const parsedResult = parser.getResult();

        const response: CLIResponse = {
          success: result.exitCode === 0,
          output: parsedResult.text || result.stdout, // Use parsed text if available
          error: result.stderr,
          duration,
          exitCode: result.exitCode,
        };

        // Log summary
        console.log('\n📊 Summary:');
        console.log(`   Text generated: ${parsedResult.text.length} chars`);
        console.log(`   Tool calls: ${parsedResult.toolCalls.length}`);
        console.log(`   Duration: ${Math.round(duration / 1000)}s`);

        this.logger.cliResponse(toolName, parsedResult.text || result.stdout, duration);

        return response;
      } else {
        // For other tools, keep using execa (need to import it)
        throw new Error(`Tool ${toolName} not yet implemented with spawn`);
      }
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      const response: CLIResponse = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration,
        exitCode: (error as { exitCode?: number }).exitCode || 1,
      };

      this.logger.error(`CLI command failed: ${command}`, {
        tool: toolName,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return response;
    }
  }

  /**
   * Wait for CLI completion with timeout handling
   */
  async waitForCompletion(
    toolName: string,
    command: string,
    timeout?: number
  ): Promise<CLIResponse> {
    const response = await this.sendCommandToCLI(toolName, command, { timeout });

    if (!response.success && response.error?.includes('timeout')) {
      this.logger.warn(`CLI timeout detected for ${toolName}`, { command });
      return await this.handleTimeout(toolName, command);
    }

    return response;
  }

  /**
   * Handle CLI timeout by sending continue command
   */
  async handleTimeout(toolName: string, originalCommand: string): Promise<CLIResponse> {
    this.logger.info(`Handling timeout for ${toolName}`, { originalCommand });

    // Send continue command
    const continueResponse = await this.sendCommandToCLI(toolName, 'continue', {
      timeout: this.config.timeouts.cliResponse,
    });

    if (continueResponse.success) {
      this.logger.info(`Continue command successful for ${toolName}`);
      return continueResponse;
    } else {
      this.logger.error(`Continue command failed for ${toolName}`, {
        error: continueResponse.error,
      });
      return continueResponse;
    }
  }

  /**
   * Send task implementation command
   */
  async sendTaskCommand(
    toolName: string,
    task: { id: string; title: string; description: string }
  ): Promise<CLIResponse> {
    let command: string;

    if (toolName === 'cursor-agent') {
      command = `Implement task: ${task.title}. Description: ${task.description}`;
    } else if (toolName === 'claude-code') {
      command = `Implement the following task: ${task.title}. Description: ${task.description}`;
    } else if (toolName === 'gemini-cli') {
      command = `Please implement this task: ${task.title}. Description: ${task.description}`;
    } else {
      command = `Implement task "${task.title}" from OpenSpec. Description: ${task.description}`;
    }

    // cursor-agent needs extra time for complex tasks (30 minutes)
    const timeout = toolName === 'cursor-agent' ? 1800000 : undefined;

    return await this.sendCommandToCLI(toolName, command, { timeout });
  }

  /**
   * Send continue implementation command
   */
  async sendContinueCommand(toolName: string, iterations: number = 10): Promise<CLIResponse> {
    let command: string;

    if (toolName === 'cursor-agent') {
      command = `Continue implementation ${iterations} times`;
    } else if (toolName === 'claude-code') {
      command = `Continue the implementation ${iterations} more times`;
    } else if (toolName === 'gemini-cli') {
      command = `Please continue the implementation ${iterations} times`;
    } else {
      command = `Continue implementation ${iterations}x`;
    }

    // cursor-agent needs extra time (30 minutes)
    const timeout = toolName === 'cursor-agent' ? 1800000 : undefined;

    return await this.sendCommandToCLI(toolName, command, { timeout });
  }

  /**
   * Send test command
   */
  async sendTestCommand(toolName: string): Promise<CLIResponse> {
    let command: string;

    if (toolName === 'cursor-agent') {
      command = `Execute comprehensive test suite with automatic error correction:

1. Run the project's test command (npm test, cargo test, pytest, go test, etc.)
2. Analyze ALL test failures and errors in detail
3. If there are ANY test failures:
   a. Read the failing test files and implementation code
   b. Identify the root cause of each failure
   c. Fix the implementation code OR fix the test if it's incorrect
   d. Run tests again to verify fixes
   e. Repeat steps a-d until ALL tests pass (100%)
4. Check test coverage:
   a. Run coverage command (npm run test:coverage, cargo llvm-cov, pytest --cov, etc.)
   b. If coverage is below threshold (95%): Add more tests to increase coverage
   c. Run coverage again until threshold is met
5. If all tests pass with adequate coverage: Report success with coverage percentage
6. Maximum 5 correction attempts

CRITICAL: ALL tests must pass (100%) and coverage must meet threshold (95%+) before proceeding.`;
    } else if (toolName === 'claude-code') {
      command =
        'Run all tests and ensure 100% passing. If tests fail, fix the issues and rerun. Check coverage meets 95%+ threshold. Maximum 5 attempts.';
    } else if (toolName === 'gemini-cli') {
      command = 'Please run tests, fix failures until all pass, and ensure coverage is 95%+.';
    } else {
      command = 'Run tests, fix failures, ensure all pass and coverage is 95%+';
    }

    return await this.sendCommandToCLI(toolName, command, { timeout: 600000 }); // 10 minutes for multiple test runs
  }

  /**
   * Send lint command
   */
  async sendLintCommand(toolName: string): Promise<CLIResponse> {
    let command: string;

    if (toolName === 'cursor-agent') {
      command = `Execute linting quality checks with automatic error correction:

1. Run the project's lint command (npm run lint, cargo clippy, ruff check, etc.)
2. Analyze ALL lint errors and warnings carefully
3. If there are ANY lint issues:
   a. Read the files with lint errors
   b. Fix ALL issues according to the linter's suggestions
   c. Run lint again to verify fixes
   d. Repeat steps a-c until linting passes with ZERO warnings
4. If linting passes: Report success
5. Maximum 3 correction attempts

CRITICAL: Do NOT proceed until linting passes with 0 warnings.`;
    } else if (toolName === 'claude-code') {
      command =
        'Run linting checks and fix all issues. Keep fixing until linting passes with 0 warnings. Maximum 3 attempts.';
    } else if (toolName === 'gemini-cli') {
      command =
        'Please run lint checks, fix any issues found, and repeat until passing with 0 warnings.';
    } else {
      command = 'Run lint checks and fix any issues until passing with 0 warnings';
    }

    return await this.sendCommandToCLI(toolName, command, { timeout: 300000 }); // 5 minutes for multiple attempts
  }

  /**
   * Send format command
   */
  async sendFormatCommand(toolName: string): Promise<CLIResponse> {
    let command: string;

    if (toolName === 'cursor-agent') {
      command = `Apply code formatting according to project standards:

1. Run the project's format command (npm run format, cargo fmt, black ., gofmt -w ., etc.)
2. If there are any formatting issues:
   a. Apply automatic formatting fixes
   b. Verify formatting is correct by running format check again
3. Ensure all files pass formatting standards
4. Report success when formatting is complete

This is typically automatic and should complete quickly.`;
    } else if (toolName === 'claude-code') {
      command = 'Format all code according to project standards using the project formatter.';
    } else if (toolName === 'gemini-cli') {
      command = 'Please format the code according to project standards.';
    } else {
      command = 'Format code according to project standards';
    }

    return await this.sendCommandToCLI(toolName, command, { timeout: 120000 }); // 2 minutes
  }

  /**
   * Send commit command
   */
  async sendCommitCommand(toolName: string, message: string): Promise<CLIResponse> {
    let command: string;

    if (toolName === 'cursor-agent') {
      command = `Commit all changes to Git with proper commit message:

1. Stage all changes: git add .
2. Create commit with this EXACT message:
   "${message}"
3. Verify commit was created successfully
4. DO NOT push (user will push manually)

Report the commit hash when complete.`;
    } else if (toolName === 'claude-code') {
      command = `Stage all changes (git add .) and commit with message: "${message}". Do not push.`;
    } else if (toolName === 'gemini-cli') {
      command = `Please commit changes with message: "${message}". Do not push.`;
    } else {
      command = `Commit changes with message: ${message}`;
    }

    return await this.sendCommandToCLI(toolName, command, { timeout: 30000 });
  }

  /**
   * Check if CLI tool is responsive
   */
  async checkCLIHealth(toolName: string): Promise<boolean> {
    try {
      const response = await this.sendCommandToCLI(toolName, 'ping', { timeout: 5000 });
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * Get CLI tool capabilities
   */
  async getCLICapabilities(toolName: string): Promise<string[]> {
    try {
      // Use very short timeout in test environment to avoid hanging on Windows
      const timeout = process.env.NODE_ENV === 'test' || process.env.VITEST ? 100 : 10000;
      const response = await this.sendCommandToCLI(toolName, 'capabilities', { timeout });

      if (response.success) {
        return response.output.split('\n').filter((line) => line.trim());
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Execute workflow step
   */
  async executeWorkflowStep(
    toolName: string,
    step: 'implement' | 'test' | 'lint' | 'format' | 'commit',
    context?: Record<string, unknown>
  ): Promise<CLIResponse> {
    const startTime = Date.now();

    this.logger.info(`Executing workflow step: ${step}`, { tool: toolName, context });

    let response: CLIResponse;

    switch (step) {
      case 'implement':
        if (context?.task) {
          response = await this.sendTaskCommand(
            toolName,
            context.task as { id: string; title: string; description: string }
          );
        } else {
          response = await this.sendCommandToCLI(toolName, 'Implement current task');
        }
        break;

      case 'test':
        response = await this.sendTestCommand(toolName);
        break;

      case 'lint':
        response = await this.sendLintCommand(toolName);
        break;

      case 'format':
        response = await this.sendFormatCommand(toolName);
        break;

      case 'commit': {
        const message = context?.message || 'Auto-commit from rulebook agent';
        response = await this.sendCommitCommand(toolName, message as string);
        break;
      }

      default:
        throw new Error(`Unknown workflow step: ${step}`);
    }

    const duration = Date.now() - startTime;
    this.logger.info(`Workflow step completed: ${step}`, {
      tool: toolName,
      success: response.success,
      duration,
    });

    return response;
  }

  /**
   * Kill all active processes (cleanup)
   */
  async killAllProcesses(): Promise<void> {
    if (this.activeProcesses.size === 0) {
      return;
    }

    await this.debugLog(`\n=== KILLING ALL ACTIVE PROCESSES ===`);
    await this.debugLog(`Active processes: ${this.activeProcesses.size}`);

    const killPromises: Promise<void>[] = [];

    for (const [processId, proc] of this.activeProcesses.entries()) {
      killPromises.push(
        (async () => {
          try {
            if (!proc.killed && proc.exitCode === null) {
              await this.debugLog(`Killing process ${processId} (PID: ${proc.pid})`);
              proc.kill('SIGKILL');

              // Wait for exit
              await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                  resolve();
                }, 500);

                proc.once('exit', () => {
                  clearTimeout(timeout);
                  resolve();
                });
              });
            }
            this.activeProcesses.delete(processId);
          } catch (error) {
            await this.debugLog(`Error killing process ${processId}: ${error}`);
          }
        })()
      );
    }

    await Promise.all(killPromises);
    await this.debugLog(`All processes killed. Remaining: ${this.activeProcesses.size}`);
    await this.debugLog(`===================================\n`);
  }

  /**
   * Smart continue detection based on CLI output patterns
   */
  async smartContinueDetection(toolName: string, lastOutput: string): Promise<boolean> {
    // Patterns that indicate CLI is still processing
    const processingPatterns = [
      /thinking/i,
      /processing/i,
      /analyzing/i,
      /generating/i,
      /working/i,
      /please wait/i,
      /\.\.\./g,
      /loading/i,
    ];

    // Patterns that indicate CLI has stopped
    const stoppedPatterns = [
      /ready/i,
      /done/i,
      /complete/i,
      /finished/i,
      /awaiting/i,
      /waiting for/i,
      /next command/i,
    ];

    // Check for processing patterns
    const isProcessing = processingPatterns.some((pattern) => pattern.test(lastOutput));
    if (isProcessing) {
      this.logger.debug(`CLI appears to be processing: ${toolName}`);
      return false; // Don't send continue
    }

    // Check for stopped patterns
    const isStopped = stoppedPatterns.some((pattern) => pattern.test(lastOutput));
    if (isStopped) {
      this.logger.debug(`CLI appears to be stopped: ${toolName}`);
      return true; // Send continue
    }

    // Default behavior: send continue if no clear indication
    this.logger.debug(`Unclear CLI state, defaulting to continue: ${toolName}`);
    return true;
  }
}

/**
 * Singleton instance of CLIBridge
 */
let cliBridgeInstance: CLIBridge | null = null;

/**
 * Create CLI bridge instance (singleton)
 */
export function createCLIBridge(
  logger: ReturnType<typeof createLogger>,
  config: RulebookConfig
): CLIBridge {
  if (!cliBridgeInstance) {
    cliBridgeInstance = new CLIBridge(logger, config);
  }
  return cliBridgeInstance;
}

/**
 * Reset singleton (for testing only)
 */
export function resetCLIBridge(): void {
  cliBridgeInstance = null;
}
