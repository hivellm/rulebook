/**
 * cursor-agent Stream Parser
 *
 * Parses stream-json output from cursor-agent CLI
 * Format: Each line is a complete JSON object
 */

export interface SystemInitEvent {
  type: 'system';
  subtype: 'init';
  apiKeySource: string;
  cwd: string;
  session_id: string;
  model: string;
  permissionMode: string;
}

export interface UserMessageEvent {
  type: 'user';
  message: {
    role: 'user';
    content: Array<{ type: string; text: string }>;
  };
  session_id: string;
}

export interface AssistantMessageEvent {
  type: 'assistant';
  message: {
    role: 'assistant';
    content: Array<{ type: string; text: string }>;
  };
  session_id: string;
  timestamp_ms?: number;
}

export interface ToolCallStartedEvent {
  type: 'tool_call';
  subtype: 'started';
  tool_call: {
    writeToolCall?: {
      args: {
        path: string;
        contents: string;
      };
    };
    readToolCall?: {
      args: {
        path: string;
      };
    };
    bashToolCall?: {
      args: {
        command: string;
      };
    };
  };
  session_id: string;
}

export interface ToolCallCompletedEvent {
  type: 'tool_call';
  subtype: 'completed';
  tool_call: {
    writeToolCall?: {
      result: {
        success?: {
          linesCreated: number;
          fileSize: number;
        };
        error?: string;
      };
    };
    readToolCall?: {
      result: {
        success?: {
          totalLines: number;
          content: string;
        };
        error?: string;
      };
    };
    bashToolCall?: {
      result: {
        success?: {
          exitCode: number;
          stdout: string;
          stderr: string;
        };
        error?: string;
      };
    };
  };
  session_id: string;
}

export interface ResultEvent {
  type: 'result';
  subtype: 'success' | 'error';
  duration_ms: number;
  duration_api_ms: number;
  is_error: boolean;
  result: string;
  session_id: string;
  request_id: string;
}

export type CursorAgentEvent =
  | SystemInitEvent
  | UserMessageEvent
  | AssistantMessageEvent
  | ToolCallStartedEvent
  | ToolCallCompletedEvent
  | ResultEvent;

export interface ParsedResult {
  success: boolean;
  text: string;
  toolCalls: Array<{
    type: 'read' | 'write' | 'bash';
    details: string;
    result?: string;
  }>;
  duration: number;
  sessionId: string;
}

/**
 * Parse a single JSON line from cursor-agent stream
 */
export function parseStreamLine(line: string): CursorAgentEvent | null {
  try {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const event = JSON.parse(trimmed) as CursorAgentEvent;
    return event;
  } catch (error) {
    // Failed to parse JSON line - ignore silently
    return null;
  }
}

/**
 * Process cursor-agent stream output with real-time progress
 */
export class CursorAgentStreamParser {
  private accumulatedText = '';
  private toolCalls: ParsedResult['toolCalls'] = [];
  private sessionId = '';
  private startTime = Date.now();
  private toolCount = 0;
  private completed = false;
  private completionCallback?: () => void;

  /**
   * Set callback to be called when result event is received
   */
  onComplete(callback: () => void): void {
    this.completionCallback = callback;
  }

  /**
   * Check if parsing is completed
   */
  isCompleted(): boolean {
    return this.completed;
  }

  /**
   * Process a single event from the stream
   */
  processEvent(event: CursorAgentEvent): void {
    // Don't log debug info - it interferes with blessed UI
    
    switch (event.type) {
      case 'system':
        this.handleSystemEvent(event);
        break;
      case 'user':
        this.handleUserEvent(event);
        break;
      case 'assistant':
        this.handleAssistantEvent(event);
        break;
      case 'tool_call':
        this.handleToolCallEvent(event);
        break;
      case 'result':
        this.handleResultEvent(event);
        break;
      default:
        // Unknown event type - ignore
    }
  }

  /**
   * Process multiple lines of stream output
   */
  processLines(output: string): void {
    const lines = output.split('\n');
    for (const line of lines) {
      const event = parseStreamLine(line);
      if (event) {
        this.processEvent(event);
      }
    }
  }

  /**
   * Get the final parsed result
   */
  getResult(): ParsedResult {
    return {
      success: true,
      text: this.accumulatedText,
      toolCalls: this.toolCalls,
      duration: Date.now() - this.startTime,
      sessionId: this.sessionId,
    };
  }

  private handleSystemEvent(event: SystemInitEvent): void {
    if (event.subtype === 'init') {
      this.sessionId = event.session_id;
      // System info logged silently
    }
  }

  private handleUserEvent(event: UserMessageEvent): void {
    this.sessionId = event.session_id;
    // User message is just echoed back, no action needed
  }

  private handleAssistantEvent(event: AssistantMessageEvent): void {
    this.sessionId = event.session_id;
    
    // Extract text content from assistant message
    const text = event.message.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');

    // Accumulate text (stream-partial-output sends incremental deltas)
    if (text && !this.accumulatedText.includes(text)) {
      this.accumulatedText = text;
      // Don't log progress - it floods the output
    }
  }

  private handleToolCallEvent(event: ToolCallStartedEvent | ToolCallCompletedEvent): void {
    this.sessionId = event.session_id;

    if (event.subtype === 'started') {
      this.toolCount++;
      const startedEvent = event as ToolCallStartedEvent;

      if (startedEvent.tool_call.writeToolCall) {
        const path = startedEvent.tool_call.writeToolCall.args.path;
        // Tool call logged silently
        this.toolCalls.push({
          type: 'write',
          details: `Write to ${path}`,
        });
      } else if (startedEvent.tool_call.readToolCall) {
        const path = startedEvent.tool_call.readToolCall.args.path;
        // Tool call logged silently
        this.toolCalls.push({
          type: 'read',
          details: `Read from ${path}`,
        });
      } else if (startedEvent.tool_call.bashToolCall) {
        const cmd = startedEvent.tool_call.bashToolCall.args.command;
        // Tool call logged silently
        this.toolCalls.push({
          type: 'bash',
          details: `Execute: ${cmd}`,
        });
      }
    } else if (event.subtype === 'completed') {
      const completedEvent = event as ToolCallCompletedEvent;

      if (completedEvent.tool_call.writeToolCall?.result.success) {
        const { linesCreated, fileSize } = completedEvent.tool_call.writeToolCall.result.success;
        const result = `Created ${linesCreated} lines (${fileSize} bytes)`;
        // Result logged silently

        // Update the last tool call with result
        if (this.toolCalls.length > 0) {
          this.toolCalls[this.toolCalls.length - 1].result = result;
        }
      } else if (completedEvent.tool_call.writeToolCall?.result.error) {
        const error = completedEvent.tool_call.writeToolCall.result.error;
        // Error logged silently

        if (this.toolCalls.length > 0) {
          this.toolCalls[this.toolCalls.length - 1].result = `Error: ${error}`;
        }
      }

      if (completedEvent.tool_call.readToolCall?.result.success) {
        const { totalLines } = completedEvent.tool_call.readToolCall.result.success;
        const result = `Read ${totalLines} lines`;
        // Result logged silently

        if (this.toolCalls.length > 0) {
          this.toolCalls[this.toolCalls.length - 1].result = result;
        }
      } else if (completedEvent.tool_call.readToolCall?.result.error) {
        const error = completedEvent.tool_call.readToolCall.result.error;
        // Error logged silently

        if (this.toolCalls.length > 0) {
          this.toolCalls[this.toolCalls.length - 1].result = `Error: ${error}`;
        }
      }

      if (completedEvent.tool_call.bashToolCall?.result.success) {
        const { exitCode } = completedEvent.tool_call.bashToolCall.result.success;
        const result = `Exit code ${exitCode}`;
        // Result logged silently

        if (this.toolCalls.length > 0) {
          this.toolCalls[this.toolCalls.length - 1].result = result;
        }
      } else if (completedEvent.tool_call.bashToolCall?.result.error) {
        const error = completedEvent.tool_call.bashToolCall.result.error;
        // Error logged silently

        if (this.toolCalls.length > 0) {
          this.toolCalls[this.toolCalls.length - 1].result = `Error: ${error}`;
        }
      }
    }
  }

  private handleResultEvent(_event: ResultEvent): void {
    // Completion logged silently
    
    // Mark as completed and trigger callback
    this.completed = true;
    if (this.completionCallback) {
      this.completionCallback();
    }
  }
}

/**
 * Parse complete cursor-agent stream output
 */
export function parseCursorAgentOutput(output: string): ParsedResult {
  const parser = new CursorAgentStreamParser();
  parser.processLines(output);
  return parser.getResult();
}
