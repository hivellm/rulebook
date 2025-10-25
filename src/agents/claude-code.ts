/**
 * claude-code Stream Parser
 *
 * Parses output from claude-code CLI
 * Command: claude --headless "PROMPT"
 * Output: Stream of text with progress indicators
 */

export interface ClaudeCodeEvent {
  type: 'progress' | 'text' | 'tool_call' | 'completion' | 'error';
  content: string;
  timestamp: number;
}

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
 * Parse a single line from claude-code output
 */
export function parseClaudeCodeLine(line: string): ClaudeCodeEvent | null {
  try {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Look for progress indicators
    if (trimmed.includes('...') || trimmed.includes('thinking') || trimmed.includes('processing')) {
      return {
        type: 'progress',
        content: trimmed,
        timestamp: Date.now(),
      };
    }

    // Look for tool calls
    if (trimmed.includes('🔧') || trimmed.includes('Tool:') || trimmed.includes('Executing:')) {
      return {
        type: 'tool_call',
        content: trimmed,
        timestamp: Date.now(),
      };
    }

    // Look for completion indicators
    if (trimmed.includes('✅') || trimmed.includes('Complete') || trimmed.includes('Done')) {
      return {
        type: 'completion',
        content: trimmed,
        timestamp: Date.now(),
      };
    }

    // Look for errors
    if (trimmed.includes('❌') || trimmed.includes('Error:') || trimmed.includes('Failed:')) {
      return {
        type: 'error',
        content: trimmed,
        timestamp: Date.now(),
      };
    }

    // Default to text content
    return {
      type: 'text',
      content: trimmed,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Failed to parse claude-code line:', line);
    return null;
  }
}

/**
 * Process claude-code stream output with real-time progress
 */
export class ClaudeCodeStreamParser {
  private accumulatedText = '';
  private toolCalls: ParsedResult['toolCalls'] = [];
  private sessionId = `claude-${Date.now()}`;
  private startTime = Date.now();
  private toolCount = 0;
  private completed = false;
  private completionCallback?: () => void;

  /**
   * Set callback to be called when completion is detected
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
  processEvent(event: ClaudeCodeEvent): void {
    switch (event.type) {
      case 'progress':
        this.handleProgressEvent(event);
        break;
      case 'text':
        this.handleTextEvent(event);
        break;
      case 'tool_call':
        this.handleToolCallEvent(event);
        break;
      case 'completion':
        this.handleCompletionEvent(event);
        break;
      case 'error':
        this.handleErrorEvent(event);
        break;
    }
  }

  /**
   * Process multiple lines of stream output
   */
  processLines(output: string): void {
    const lines = output.split('\n');
    for (const line of lines) {
      const event = parseClaudeCodeLine(line);
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
      success: !this.completed || this.accumulatedText.length > 0,
      text: this.accumulatedText,
      toolCalls: this.toolCalls,
      duration: Date.now() - this.startTime,
      sessionId: this.sessionId,
    };
  }

  private handleProgressEvent(event: ClaudeCodeEvent): void {
    // Show progress indicator
    process.stdout.write(`\r⏳ ${event.content}`);
  }

  private handleTextEvent(event: ClaudeCodeEvent): void {
    // Accumulate text content
    if (event.content && !this.accumulatedText.includes(event.content)) {
      this.accumulatedText += event.content + '\n';

      // Show progress
      process.stdout.write(`\r📝 Generating: ${this.accumulatedText.length} chars`);
    }
  }

  private handleToolCallEvent(event: ClaudeCodeEvent): void {
    this.toolCount++;

    // Extract tool type and details from content
    let toolType: 'read' | 'write' | 'bash' = 'bash';
    const details = event.content;

    if (event.content.includes('read') || event.content.includes('📖')) {
      toolType = 'read';
    } else if (event.content.includes('write') || event.content.includes('📝')) {
      toolType = 'write';
    }

    console.log(`\n🔧 Tool #${this.toolCount}: ${details}`);
    this.toolCalls.push({
      type: toolType,
      details,
    });
  }

  private handleCompletionEvent(event: ClaudeCodeEvent): void {
    console.log(`\n✅ ${event.content}`);

    // Mark as completed and trigger callback
    this.completed = true;
    if (this.completionCallback) {
      this.completionCallback();
    }
  }

  private handleErrorEvent(event: ClaudeCodeEvent): void {
    console.log(`\n❌ ${event.content}`);

    // Update last tool call with error if available
    if (this.toolCalls.length > 0) {
      this.toolCalls[this.toolCalls.length - 1].result = `Error: ${event.content}`;
    }
  }
}

/**
 * Parse complete claude-code output
 */
export function parseClaudeCodeOutput(output: string): ParsedResult {
  const parser = new ClaudeCodeStreamParser();
  parser.processLines(output);
  return parser.getResult();
}
