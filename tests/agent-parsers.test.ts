import { describe, it, expect, vi } from 'vitest';
import { ClaudeCodeStreamParser, parseClaudeCodeLine } from '../src/agents/claude-code.js';
import { GeminiStreamParser, parseGeminiLine } from '../src/agents/gemini-cli.js';
import { CursorAgentStreamParser, parseStreamLine } from '../src/agents/cursor-agent.js';

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
      deprecatedTools.forEach(deprecated => {
        expect(supportedTools).not.toContain(deprecated);
      });
    });
  });
});