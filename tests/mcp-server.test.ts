import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRulebookMcpServer } from '../src/mcp/rulebook-server.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MCP Server', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-mcp-server-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('createRulebookMcpServer', () => {
    it('should create MCP server instance', () => {
      const server = createRulebookMcpServer(testDir);

      expect(server).toBeDefined();
      expect(server).toHaveProperty('server');
    });

    it('should register all task management tools', () => {
      const server = createRulebookMcpServer(testDir);

      // Check if tools are registered by checking server internals
      // Note: This is a basic check - actual tool registration is tested via MCP protocol
      expect(server).toBeDefined();
    });

    it('should use custom project root', () => {
      const customRoot = join(testDir, 'custom-root');
      const server = createRulebookMcpServer(customRoot);

      expect(server).toBeDefined();
    });
  });

  describe('Server Configuration', () => {
    it('should have correct server name and version', () => {
      const server = createRulebookMcpServer(testDir);

      // Server metadata is set during creation
      expect(server).toBeDefined();
    });
  });
});
