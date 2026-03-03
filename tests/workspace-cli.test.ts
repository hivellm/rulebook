import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// We test the CLI workspace commands by calling the exported functions directly.
// They rely on process.cwd(), existsSync, readFileSync, writeFileSync, console.log, etc.
// We use a real temp directory to avoid complex mocking of fs globals.

describe('Workspace CLI Commands', () => {
  let testDir: string;
  let originalCwd: () => string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = join(tmpdir(), `rulebook-ws-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(join(testDir, '.rulebook'), { recursive: true });

    // Mock process.cwd to return our test directory
    originalCwd = process.cwd;
    process.cwd = () => testDir;

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    consoleSpy.mockRestore();
    consoleErrSpy.mockRestore();

    if (existsSync(testDir)) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  describe('workspaceInitCommand', () => {
    it('should create .rulebook/workspace.json with empty config when no structure detected', async () => {
      const { workspaceInitCommand } = await import('../src/cli/commands.js');
      await workspaceInitCommand();

      const configPath = join(testDir, '.rulebook/workspace.json');
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      expect(config.name).toBeTruthy();
      expect(config.version).toBe('1.0.0');
      expect(config.projects).toEqual([]);
    });

    it('should skip if .rulebook/workspace.json already exists', async () => {
      writeFileSync(join(testDir, '.rulebook/workspace.json'), '{}');

      const { workspaceInitCommand } = await import('../src/cli/commands.js');
      await workspaceInitCommand();

      // Should log "already initialized" warning
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already initialized')
      );
    });

    it('should detect monorepo structure', async () => {
      // Create a pnpm-workspace.yaml + packages dir
      writeFileSync(join(testDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
      await fs.mkdir(join(testDir, 'packages', 'core'), { recursive: true });
      writeFileSync(join(testDir, 'packages', 'core', 'package.json'), '{"name":"core"}');

      const { workspaceInitCommand } = await import('../src/cli/commands.js');
      await workspaceInitCommand();

      const configPath = join(testDir, '.rulebook/workspace.json');
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));

      expect(config.projects.length).toBeGreaterThan(0);
      expect(config.projects.some((p: any) => p.name === 'core')).toBe(true);
    });
  });

  describe('workspaceAddCommand', () => {
    it('should add a project to existing workspace', async () => {
      const config = {
        name: 'test-ws',
        version: '1.0.0',
        projects: [],
      };
      writeFileSync(
        join(testDir, '.rulebook/workspace.json'),
        JSON.stringify(config, null, 2) + '\n'
      );

      // Create project dir
      await fs.mkdir(join(testDir, 'frontend'), { recursive: true });

      const { workspaceAddCommand } = await import('../src/cli/commands.js');
      await workspaceAddCommand('./frontend');

      const updated = JSON.parse(readFileSync(join(testDir, '.rulebook/workspace.json'), 'utf-8'));
      expect(updated.projects).toHaveLength(1);
      expect(updated.projects[0].name).toBe('frontend');
      expect(updated.defaultProject).toBe('frontend');
    });

    it('should exit if no workspace found', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });

      const { workspaceAddCommand } = await import('../src/cli/commands.js');
      await expect(workspaceAddCommand('./some-dir')).rejects.toThrow('process.exit');

      expect(consoleErrSpy).toHaveBeenCalledWith(
        expect.stringContaining('No workspace found')
      );

      mockExit.mockRestore();
    });

    it('should reject duplicate project names', async () => {
      const config = {
        name: 'test-ws',
        version: '1.0.0',
        projects: [{ name: 'frontend', path: './frontend' }],
      };
      writeFileSync(
        join(testDir, '.rulebook/workspace.json'),
        JSON.stringify(config) + '\n'
      );

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });

      const { workspaceAddCommand } = await import('../src/cli/commands.js');
      await expect(workspaceAddCommand('./frontend')).rejects.toThrow('process.exit');

      expect(consoleErrSpy).toHaveBeenCalledWith(
        expect.stringContaining('already exists')
      );

      mockExit.mockRestore();
    });
  });

  describe('workspaceRemoveCommand', () => {
    it('should remove a project from workspace', async () => {
      const config = {
        name: 'test-ws',
        version: '1.0.0',
        projects: [
          { name: 'frontend', path: './frontend' },
          { name: 'backend', path: './backend' },
        ],
        defaultProject: 'frontend',
      };
      writeFileSync(
        join(testDir, '.rulebook/workspace.json'),
        JSON.stringify(config) + '\n'
      );

      const { workspaceRemoveCommand } = await import('../src/cli/commands.js');
      await workspaceRemoveCommand('frontend');

      const updated = JSON.parse(readFileSync(join(testDir, '.rulebook/workspace.json'), 'utf-8'));
      expect(updated.projects).toHaveLength(1);
      expect(updated.projects[0].name).toBe('backend');
      // Default should shift to remaining project
      expect(updated.defaultProject).toBe('backend');
    });

    it('should exit if no workspace found', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });

      const { workspaceRemoveCommand } = await import('../src/cli/commands.js');
      await expect(workspaceRemoveCommand('frontend')).rejects.toThrow('process.exit');

      mockExit.mockRestore();
    });

    it('should exit if project not found', async () => {
      const config = {
        name: 'test-ws',
        version: '1.0.0',
        projects: [{ name: 'backend', path: './backend' }],
      };
      writeFileSync(
        join(testDir, '.rulebook/workspace.json'),
        JSON.stringify(config) + '\n'
      );

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });

      const { workspaceRemoveCommand } = await import('../src/cli/commands.js');
      await expect(workspaceRemoveCommand('nonexistent')).rejects.toThrow('process.exit');

      expect(consoleErrSpy).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      );

      mockExit.mockRestore();
    });
  });

  describe('workspaceListCommand', () => {
    it('should display workspace info when config exists', async () => {
      const config = {
        name: 'my-workspace',
        version: '1.0.0',
        projects: [
          { name: 'frontend', path: './frontend' },
          { name: 'backend', path: './backend' },
        ],
        defaultProject: 'frontend',
      };
      writeFileSync(
        join(testDir, '.rulebook/workspace.json'),
        JSON.stringify(config) + '\n'
      );

      const { workspaceListCommand } = await import('../src/cli/commands.js');
      await workspaceListCommand();

      // Should show workspace name, projects, and total count
      const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(output).toContain('my-workspace');
      expect(output).toContain('2 project(s) total');
    });

    it('should display message when no workspace found', async () => {
      const { workspaceListCommand } = await import('../src/cli/commands.js');
      await workspaceListCommand();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No workspace found')
      );
    });
  });

  describe('workspaceStatusCommand', () => {
    it('should display status when workspace exists', async () => {
      const config = {
        name: 'my-workspace',
        version: '1.0.0',
        projects: [{ name: 'frontend', path: './frontend' }],
        defaultProject: 'frontend',
      };
      writeFileSync(
        join(testDir, '.rulebook/workspace.json'),
        JSON.stringify(config) + '\n'
      );

      // Create the frontend project directory with .rulebook
      await fs.mkdir(join(testDir, 'frontend'), { recursive: true });

      const { workspaceStatusCommand } = await import('../src/cli/commands.js');
      await workspaceStatusCommand();

      const output = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(output).toContain('my-workspace');
    });

    it('should display message when no workspace found', async () => {
      const { workspaceStatusCommand } = await import('../src/cli/commands.js');
      await workspaceStatusCommand();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No workspace found')
      );
    });
  });
});
