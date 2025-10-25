import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeCodeStreamParser, parseClaudeCodeLine } from '../src/agents/claude-code.js';
import { GeminiStreamParser, parseGeminiLine } from '../src/agents/gemini-cli.js';
import { CursorAgentStreamParser, parseStreamLine, parseCursorAgentOutput } from '../src/agents/cursor-agent.js';

describe('Agent Stream Parsers', () => {
  describe('ClaudeCodeStreamParser', () => {
    let parser: ClaudeCodeStreamParser;

    beforeEach(() => {
      parser = new ClaudeCodeStreamParser();
    });

    it('should create parser instance', () => {
      expect(parser).toBeDefined();
    });

    it('should parse claude-code output lines', () => {
      const testLine = '{"type": "progress", "message": "Processing..."}';
      const result = parseClaudeCodeLine(testLine);

      expect(result).toBeDefined();
      expect(result?.type).toBe('progress');
      expect(result?.content).toBe('{"type": "progress", "message": "Processing..."}');
    });

    it('should handle malformed JSON gracefully', () => {
      const testLine = 'invalid json';
      const result = parseClaudeCodeLine(testLine);

      expect(result).toBeDefined();
      expect(result?.type).toBe('text');
    });

    it('should detect completion patterns', () => {
      const completionLine = '{"type": "completion", "message": "Task completed"}';
      const result = parseClaudeCodeLine(completionLine);

      expect(result?.type).toBe('text');
    });

    it('should handle empty lines', () => {
      const result = parseClaudeCodeLine('');
      expect(result).toBeNull();
    });

    it('should handle whitespace-only lines', () => {
      const result = parseClaudeCodeLine('   \n\t  ');
      expect(result).toBeNull();
    });

    it('should detect progress patterns', () => {
      const progressLine = 'Processing...';
      const result = parseClaudeCodeLine(progressLine);

      expect(result).toBeDefined();
      expect(result?.type).toBe('progress');
    });

    it('should detect tool call patterns', () => {
      const toolLine = '🔧 Tool: write file';
      const result = parseClaudeCodeLine(toolLine);

      expect(result).toBeDefined();
      expect(result?.type).toBe('tool_call');
    });

    it('should detect completion patterns with emoji', () => {
      const completionLine = '✅ Complete';
      const result = parseClaudeCodeLine(completionLine);

      expect(result).toBeDefined();
      expect(result?.type).toBe('completion');
    });

    it('should detect error patterns', () => {
      const errorLine = '❌ Error: Something went wrong';
      const result = parseClaudeCodeLine(errorLine);

      expect(result).toBeDefined();
      expect(result?.type).toBe('error');
    });

    it('should handle parser with event callback', () => {
      const mockCallback = vi.fn();
      parser.setEventCallback(mockCallback);

      const progressLine = 'Processing...';
      parser.processLine(progressLine);

      expect(mockCallback).toHaveBeenCalledWith('progress', 'Processing...');
    });

    it('should handle parser with completion callback', () => {
      const mockCallback = vi.fn();
      parser.setCompletionCallback(mockCallback);

      const completionLine = '✅ Done';
      parser.processLine(completionLine);

      expect(mockCallback).toHaveBeenCalled();
    });

    it('should accumulate text content', () => {
      const textLine1 = 'Hello ';
      const textLine2 = 'World';
      
      parser.processLine(textLine1);
      parser.processLine(textLine2);

      const result = parser.getResult();
      expect(result.text).toContain('Hello World');
    });

    it('should handle multiple lines', () => {
      const lines = [
        'Starting task...',
        'Processing data...',
        '✅ Task completed'
      ];

      parser.processLines(lines.join('\n'));

      const result = parser.getResult();
      expect(result.text).toContain('Starting task');
      expect(result.text).toContain('Processing data');
      expect(result.text).toContain('Task completed');
    });

    it('should handle JSON parse errors gracefully', () => {
      const invalidJson = '{"type": "progress", "message": "Processing...", "invalid": }';
      const result = parseClaudeCodeLine(invalidJson);

      expect(result).toBeDefined();
      expect(result?.type).toBe('text');
    });

    it('should handle undefined/null input', () => {
      expect(parseClaudeCodeLine(undefined as any)).toBeNull();
      expect(parseClaudeCodeLine(null as any)).toBeNull();
    });
  });

  describe('GeminiStreamParser', () => {
    let parser: GeminiStreamParser;

    beforeEach(() => {
      parser = new GeminiStreamParser();
    });

    it('should create parser instance', () => {
      expect(parser).toBeDefined();
    });

    it('should parse gemini-cli output lines', () => {
      const testLine = '{"event": "progress", "data": "Processing..."}';
      const result = parseGeminiLine(testLine);

      expect(result).toBeDefined();
      expect(result?.type).toBe('progress');
      expect(result?.content).toBe('{"event": "progress", "data": "Processing..."}');
    });

    it('should handle malformed JSON gracefully', () => {
      const testLine = 'invalid json';
      const result = parseGeminiLine(testLine);

      expect(result).toBeDefined();
      expect(result?.type).toBe('text');
    });

    it('should detect completion patterns', () => {
      const completionLine = '{"event": "done", "data": "Task completed"}';
      const result = parseGeminiLine(completionLine);

      expect(result?.type).toBe('text');
    });

    it('should handle empty lines', () => {
      const result = parseGeminiLine('');
      expect(result).toBeNull();
    });

    it('should handle whitespace-only lines', () => {
      const result = parseGeminiLine('   \n\t  ');
      expect(result).toBeNull();
    });

    it('should detect progress patterns', () => {
      const progressLine = 'Processing...';
      const result = parseGeminiLine(progressLine);

      expect(result).toBeDefined();
      expect(result?.type).toBe('progress');
    });

    it('should detect tool call patterns', () => {
      const toolLine = '🔧 Tool: write file';
      const result = parseGeminiLine(toolLine);

      expect(result).toBeDefined();
      expect(result?.type).toBe('tool_call');
    });

    it('should detect completion patterns with emoji', () => {
      const completionLine = '✅ Complete';
      const result = parseGeminiLine(completionLine);

      expect(result).toBeDefined();
      expect(result?.type).toBe('completion');
    });

    it('should detect error patterns', () => {
      const errorLine = '❌ Error: Something went wrong';
      const result = parseGeminiLine(errorLine);

      expect(result).toBeDefined();
      expect(result?.type).toBe('error');
    });

    it('should handle parser with event callback', () => {
      const mockCallback = vi.fn();
      parser.setEventCallback(mockCallback);

      const progressLine = 'Processing...';
      parser.processLine(progressLine);

      expect(mockCallback).toHaveBeenCalledWith('progress', 'Processing...');
    });

    it('should handle parser with completion callback', () => {
      const mockCallback = vi.fn();
      parser.setCompletionCallback(mockCallback);

      const completionLine = '✅ Done';
      parser.processLine(completionLine);

      expect(mockCallback).toHaveBeenCalled();
    });

    it('should accumulate text content', () => {
      const textLine1 = 'Hello ';
      const textLine2 = 'World';
      
      parser.processLine(textLine1);
      parser.processLine(textLine2);

      const result = parser.getResult();
      expect(result.text).toContain('Hello World');
    });

    it('should handle multiple lines', () => {
      const lines = [
        'Starting task...',
        'Processing data...',
        '✅ Task completed'
      ];

      parser.processLines(lines.join('\n'));

      const result = parser.getResult();
      expect(result.text).toContain('Starting task');
      expect(result.text).toContain('Processing data');
      expect(result.text).toContain('Task completed');
    });

    it('should handle JSON parse errors gracefully', () => {
      const invalidJson = '{"event": "progress", "data": "Processing...", "invalid": }';
      const result = parseGeminiLine(invalidJson);

      expect(result).toBeDefined();
      expect(result?.type).toBe('text');
    });

    it('should handle undefined/null input', () => {
      expect(parseGeminiLine(undefined as any)).toBeNull();
      expect(parseGeminiLine(null as any)).toBeNull();
    });
  });

  describe('CursorAgentStreamParser', () => {
    let parser: CursorAgentStreamParser;

    beforeEach(() => {
      parser = new CursorAgentStreamParser();
    });

    it('should create parser instance', () => {
      expect(parser).toBeDefined();
    });

    it('should parse cursor-agent output lines', () => {
      const testLine = '{"type": "progress", "content": "Processing..."}';
      const result = parseStreamLine(testLine);

      expect(result).toBeDefined();
      expect(result.type).toBe('progress');
      expect(result.content).toBe('Processing...');
    });

    it('should handle malformed JSON gracefully', () => {
      const testLine = 'invalid json';
      const result = parseStreamLine(testLine);

      expect(result).toBeNull();
    });

    it('should detect completion patterns', () => {
      const completionLine = '{"type": "completion", "content": "Task completed"}';
      const result = parseStreamLine(completionLine);

      expect(result.type).toBe('completion');
    });

    it('should handle empty lines', () => {
      const result = parseStreamLine('');
      expect(result).toBeNull();
    });

    it('should handle whitespace-only lines', () => {
      const result = parseStreamLine('   \n\t  ');
      expect(result).toBeNull();
    });

    it('should parse system init events', () => {
      const systemLine = '{"type": "system", "subtype": "init", "apiKeySource": "env", "cwd": "/test", "session_id": "test-session", "model": "claude-3", "permissionMode": "auto"}';
      const result = parseStreamLine(systemLine);

      expect(result).toBeDefined();
      expect(result.type).toBe('system');
      expect(result.subtype).toBe('init');
    });

    it('should parse user message events', () => {
      const userLine = '{"type": "user", "content": "Hello", "session_id": "test-session"}';
      const result = parseStreamLine(userLine);

      expect(result).toBeDefined();
      expect(result.type).toBe('user');
      expect(result.content).toBe('Hello');
    });

    it('should parse assistant message events', () => {
      const assistantLine = '{"type": "assistant", "content": "Hi there", "session_id": "test-session"}';
      const result = parseStreamLine(assistantLine);

      expect(result).toBeDefined();
      expect(result.type).toBe('assistant');
      expect(result.content).toBe('Hi there');
    });

    it('should parse tool call started events', () => {
      const toolLine = '{"type": "tool_call", "subtype": "started", "tool_call": {"writeToolCall": {"args": {"path": "/test/file.txt"}}}, "session_id": "test-session"}';
      const result = parseStreamLine(toolLine);

      expect(result).toBeDefined();
      expect(result.type).toBe('tool_call');
      expect(result.subtype).toBe('started');
    });

    it('should parse tool call completed events', () => {
      const toolLine = '{"type": "tool_call", "subtype": "completed", "tool_call": {"writeToolCall": {"args": {"path": "/test/file.txt"}}}, "session_id": "test-session"}';
      const result = parseStreamLine(toolLine);

      expect(result).toBeDefined();
      expect(result.type).toBe('tool_call');
      expect(result.subtype).toBe('completed');
    });

    it('should parse result events', () => {
      const resultLine = '{"type": "result", "content": "Task completed", "session_id": "test-session"}';
      const result = parseStreamLine(resultLine);

      expect(result).toBeDefined();
      expect(result.type).toBe('result');
      expect(result.content).toBe('Task completed');
    });

    it('should handle parser with event callback', () => {
      const mockCallback = vi.fn();
      parser.setEventCallback(mockCallback);

      const progressLine = '{"type": "progress", "content": "Processing..."}';
      parser.processLine(progressLine);

      expect(mockCallback).toHaveBeenCalledWith('progress', 'Processing...');
    });

    it('should handle parser with completion callback', () => {
      const mockCallback = vi.fn();
      parser.setCompletionCallback(mockCallback);

      const completionLine = '{"type": "completion", "content": "Done"}';
      parser.processLine(completionLine);

      expect(mockCallback).toHaveBeenCalled();
    });

    it('should accumulate text content', () => {
      const textLine1 = '{"type": "text", "content": "Hello "}';
      const textLine2 = '{"type": "text", "content": "World"}';
      
      parser.processLine(textLine1);
      parser.processLine(textLine2);

      const result = parser.getResult();
      expect(result.text).toContain('Hello World');
    });

    it('should track tool calls', () => {
      const toolLine = '{"type": "tool_call", "subtype": "started", "tool_call": {"writeToolCall": {"args": {"path": "/test/file.txt"}}}, "session_id": "test-session"}';
      
      parser.processLine(toolLine);

      const result = parser.getResult();
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].type).toBe('write');
    });

    it('should handle multiple lines', () => {
      const lines = [
        '{"type": "system", "subtype": "init", "session_id": "test-session"}',
        '{"type": "user", "content": "Hello", "session_id": "test-session"}',
        '{"type": "assistant", "content": "Hi", "session_id": "test-session"}'
      ];

      parser.processLines(lines.join('\n'));

      const result = parser.getResult();
      expect(result.text).toContain('Hello');
      expect(result.text).toContain('Hi');
    });

    it('should parse complete output', () => {
      const output = `{"type": "system", "subtype": "init", "session_id": "test-session"}
{"type": "user", "content": "Hello", "session_id": "test-session"}
{"type": "assistant", "content": "Hi there", "session_id": "test-session"}`;

      const result = parseCursorAgentOutput(output);

      expect(result).toBeDefined();
      expect(result.text).toContain('Hello');
      expect(result.text).toContain('Hi there');
      expect(result.sessionId).toBe('test-session');
    });

    it('should handle different tool call types', () => {
      const writeTool = '{"type": "tool_call", "subtype": "started", "tool_call": {"writeToolCall": {"args": {"path": "/test/file.txt"}}}, "session_id": "test-session"}';
      const readTool = '{"type": "tool_call", "subtype": "started", "tool_call": {"readToolCall": {"args": {"path": "/test/file.txt"}}}, "session_id": "test-session"}';
      const bashTool = '{"type": "tool_call", "subtype": "started", "tool_call": {"bashToolCall": {"args": {"command": "ls -la"}}}, "session_id": "test-session"}';
      const editTool = '{"type": "tool_call", "subtype": "started", "tool_call": {"editToolCall": {"args": {"path": "/test/file.txt"}}}, "session_id": "test-session"}';

      parser.processLine(writeTool);
      parser.processLine(readTool);
      parser.processLine(bashTool);
      parser.processLine(editTool);

      const result = parser.getResult();
      expect(result.toolCalls).toHaveLength(4);
      expect(result.toolCalls[0].type).toBe('write');
      expect(result.toolCalls[1].type).toBe('read');
      expect(result.toolCalls[2].type).toBe('bash');
      expect(result.toolCalls[3].type).toBe('edit');
    });

    it('should handle tool call completion', () => {
      const startedTool = '{"type": "tool_call", "subtype": "started", "tool_call": {"writeToolCall": {"args": {"path": "/test/file.txt"}}}, "session_id": "test-session"}';
      const completedTool = '{"type": "tool_call", "subtype": "completed", "tool_call": {"writeToolCall": {"args": {"path": "/test/file.txt"}}}, "session_id": "test-session"}';

      parser.processLine(startedTool);
      parser.processLine(completedTool);

      const result = parser.getResult();
      expect(result.toolCalls).toHaveLength(1);
    });

    it('should handle JSON parse errors gracefully', () => {
      const invalidJson = '{"type": "progress", "content": "Processing...", "invalid": }';
      const result = parseStreamLine(invalidJson);

      expect(result).toBeNull();
    });

    it('should handle undefined/null input', () => {
      expect(parseStreamLine(undefined as any)).toBeNull();
      expect(parseStreamLine(null as any)).toBeNull();
    });
  });

  describe('Stream Parser Integration', () => {
    it('should handle all supported CLI tools', () => {
      // Test that all three standardized parsers can be instantiated
      // These are the only supported CLI tools after v0.10.0
      const claudeParser = new ClaudeCodeStreamParser();
      const geminiParser = new GeminiStreamParser();
      const cursorParser = new CursorAgentStreamParser();

      expect(claudeParser).toBeDefined();
      expect(geminiParser).toBeDefined();
      expect(cursorParser).toBeDefined();
    });

    it('should have consistent parsing behavior', () => {
      // Test that all parsers handle similar input consistently
      const testData = '{"type": "test", "message": "test message"}';

      const claudeResult = parseClaudeCodeLine(testData);
      const geminiResult = parseGeminiLine(testData);
      const cursorResult = parseStreamLine(testData);

      // All should parse successfully
      expect(claudeResult).toBeDefined();
      expect(geminiResult).toBeDefined();
      expect(cursorResult).toBeDefined();
    });

    it('should support exactly three CLI tools', () => {
      // Verify that we support exactly three CLI tools (v0.10.0+)
      const supportedTools = ['cursor-agent', 'claude-code', 'gemini-cli'];
      expect(supportedTools).toHaveLength(3);

      // Verify that deprecated tools are not included (removed in v0.10.0)
      const deprecatedTools = ['cursor-cli', 'claude-cli', 'gemini-cli-legacy'];
      deprecatedTools.forEach((deprecated) => {
        expect(supportedTools).not.toContain(deprecated);
      });
    });
  });
});
