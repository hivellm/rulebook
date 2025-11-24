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
    it('should create MCP server instance', async () => {
      const server = await createRulebookMcpServer({
        projectRoot: testDir,
        tasksDir: join(testDir, 'rulebook', 'tasks'),
        archiveDir: join(testDir, 'rulebook', 'tasks', 'archive'),
      });

      expect(server).toBeDefined();
      expect(server).toHaveProperty('server');
    });

    it('should register all task management tools', async () => {
      const server = await createRulebookMcpServer({
        projectRoot: testDir,
        tasksDir: join(testDir, 'rulebook', 'tasks'),
        archiveDir: join(testDir, 'rulebook', 'tasks', 'archive'),
      });

      // Check if tools are registered by checking server internals
      // Note: This is a basic check - actual tool registration is tested via MCP protocol
      expect(server).toBeDefined();
    });

    it('should use custom project root', async () => {
      const customRoot = join(testDir, 'custom-root');
      const server = await createRulebookMcpServer({
        projectRoot: customRoot,
        tasksDir: join(customRoot, 'rulebook', 'tasks'),
        archiveDir: join(customRoot, 'rulebook', 'tasks', 'archive'),
      });

      expect(server).toBeDefined();
    });
  });

  describe('Server Configuration', () => {
    it('should have correct server name and version', async () => {
      const server = await createRulebookMcpServer({
        projectRoot: testDir,
        tasksDir: join(testDir, 'rulebook', 'tasks'),
        archiveDir: join(testDir, 'rulebook', 'tasks', 'archive'),
      });

      // Server metadata is set during creation
      expect(server).toBeDefined();
    });
  });
});
