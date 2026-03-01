import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { detectProject } from '../src/core/detector.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'seq-thinking-test-'));
  // Create a minimal package.json so project detection has something to work with
  await writeFile(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test-project' }));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function createMcpJson(dir: string, content: object, filename = 'mcp.json') {
  await writeFile(join(dir, filename), JSON.stringify(content));
}

describe('Sequential Thinking MCP detection', () => {
  it('not detected when no mcp config exists', async () => {
    const result = await detectProject(tmpDir);
    const mod = result.modules.find((m) => m.module === 'sequential_thinking');
    expect(mod).toBeDefined();
    expect(mod!.detected).toBe(false);
  });

  it('detected via sequential-thinking key in mcpServers', async () => {
    await createMcpJson(tmpDir, {
      mcpServers: {
        'sequential-thinking': {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
        },
      },
    });

    const result = await detectProject(tmpDir);
    const mod = result.modules.find((m) => m.module === 'sequential_thinking');
    expect(mod!.detected).toBe(true);
  });

  it('detected via sequential_thinking key in mcpServers', async () => {
    await createMcpJson(tmpDir, {
      mcpServers: {
        sequential_thinking: { command: 'npx', args: [] },
      },
    });

    const result = await detectProject(tmpDir);
    const mod = result.modules.find((m) => m.module === 'sequential_thinking');
    expect(mod!.detected).toBe(true);
  });

  it('detected via sequentialThinking camelCase key', async () => {
    await createMcpJson(tmpDir, {
      mcpServers: {
        sequentialThinking: { command: 'npx', args: [] },
      },
    });

    const result = await detectProject(tmpDir);
    const mod = result.modules.find((m) => m.module === 'sequential_thinking');
    expect(mod!.detected).toBe(true);
  });

  it('detected via args containing sequential-thinking package name', async () => {
    await createMcpJson(tmpDir, {
      mcpServers: {
        'my-thinking-tool': {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
        },
      },
    });

    const result = await detectProject(tmpDir);
    const mod = result.modules.find((m) => m.module === 'sequential_thinking');
    expect(mod!.detected).toBe(true);
  });

  it('detected via .cursor/mcp.json', async () => {
    await mkdir(join(tmpDir, '.cursor'), { recursive: true });
    await createMcpJson(
      join(tmpDir, '.cursor'),
      {
        mcpServers: {
          'sequential-thinking': { command: 'npx', args: [] },
        },
      },
      'mcp.json'
    );

    const result = await detectProject(tmpDir);
    const mod = result.modules.find((m) => m.module === 'sequential_thinking');
    expect(mod!.detected).toBe(true);
  });

  it('sequential_thinking appears in modules list regardless of detection status', async () => {
    const result = await detectProject(tmpDir);
    const modules = result.modules.map((m) => m.module);
    expect(modules).toContain('sequential_thinking');
  });
});
