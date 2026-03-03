import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hasLegacyAbsolutePaths,
  migrateMcpJson,
  migrateLegacyMcpConfigs,
} from '../src/core/workspace/legacy-migrator';

vi.mock('../src/utils/file-system.js', () => ({
  fileExists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('glob', () => ({
  glob: vi.fn(),
}));

import { fileExists, readFile, writeFile } from '../src/utils/file-system';
import { glob } from 'glob';

const mockFileExists = vi.mocked(fileExists);
const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockGlob = vi.mocked(glob);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('hasLegacyAbsolutePaths', () => {
  it('should return false when file does not exist', async () => {
    mockFileExists.mockResolvedValue(false);

    const result = await hasLegacyAbsolutePaths('/some/.mcp.json');
    expect(result).toBe(false);
  });

  it('should return false when file has invalid JSON', async () => {
    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue('{ broken json }');

    const result = await hasLegacyAbsolutePaths('/some/.mcp.json');
    expect(result).toBe(false);
  });

  it('should return false when file has no mcpServers key', async () => {
    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify({ version: 1 }));

    const result = await hasLegacyAbsolutePaths('/some/.mcp.json');
    expect(result).toBe(false);
  });

  it('should return false when rulebook entry has no --project-root', async () => {
    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        mcpServers: {
          rulebook: {
            command: 'npx',
            args: ['-y', '@hivehub/rulebook@latest', 'mcp-server'],
          },
        },
      })
    );

    const result = await hasLegacyAbsolutePaths('/some/.mcp.json');
    expect(result).toBe(false);
  });

  it('should return true when rulebook entry has absolute --project-root', async () => {
    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        mcpServers: {
          rulebook: {
            command: 'npx',
            args: [
              '-y',
              '@hivehub/rulebook@latest',
              'mcp-server',
              '--project-root',
              '/Users/someone/projects/my-app',
            ],
          },
        },
      })
    );

    const result = await hasLegacyAbsolutePaths('/some/.mcp.json');
    expect(result).toBe(true);
  });

  it('should return true when rulebook-memory entry has absolute --project-root', async () => {
    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        mcpServers: {
          'rulebook-memory': {
            command: 'npx',
            args: [
              '-y',
              '@hivehub/rulebook@latest',
              'mcp-server',
              '--project-root',
              '/home/user/project',
            ],
          },
        },
      })
    );

    const result = await hasLegacyAbsolutePaths('/some/.mcp.json');
    expect(result).toBe(true);
  });

  it('should return false when --project-root has a relative path', async () => {
    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        mcpServers: {
          rulebook: {
            command: 'npx',
            args: [
              '-y',
              '@hivehub/rulebook@latest',
              'mcp-server',
              '--project-root',
              './relative/path',
            ],
          },
        },
      })
    );

    const result = await hasLegacyAbsolutePaths('/some/.mcp.json');
    expect(result).toBe(false);
  });

  it('should ignore non-rulebook entries with --project-root', async () => {
    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        mcpServers: {
          'other-server': {
            command: 'npx',
            args: ['other-tool', '--project-root', '/abs/path'],
          },
        },
      })
    );

    const result = await hasLegacyAbsolutePaths('/some/.mcp.json');
    expect(result).toBe(false);
  });
});

describe('migrateMcpJson', () => {
  it('should return false when file does not exist', async () => {
    mockFileExists.mockResolvedValue(false);

    const result = await migrateMcpJson('/some/.mcp.json');
    expect(result).toBe(false);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('should return false when file has invalid JSON', async () => {
    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue('not json');

    const result = await migrateMcpJson('/some/.mcp.json');
    expect(result).toBe(false);
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('should return false when no mcpServers key', async () => {
    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify({ version: 1 }));

    const result = await migrateMcpJson('/some/.mcp.json');
    expect(result).toBe(false);
  });

  it('should return false when rulebook entry has no --project-root', async () => {
    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        mcpServers: {
          rulebook: {
            command: 'npx',
            args: ['-y', '@hivehub/rulebook@latest', 'mcp-server'],
          },
        },
      })
    );

    const result = await migrateMcpJson('/some/.mcp.json');
    expect(result).toBe(false);
  });

  it('should migrate rulebook entry with absolute --project-root and create backup', async () => {
    const originalConfig = {
      mcpServers: {
        rulebook: {
          command: 'npx',
          args: [
            '-y',
            '@hivehub/rulebook@latest',
            'mcp-server',
            '--project-root',
            '/Users/someone/projects/my-app',
          ],
        },
        'other-server': {
          command: 'node',
          args: ['server.js'],
        },
      },
    };
    const originalJson = JSON.stringify(originalConfig);

    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue(originalJson);
    mockWriteFile.mockResolvedValue(undefined);

    const result = await migrateMcpJson('/project/.mcp.json');

    expect(result).toBe(true);

    // Should create backup
    expect(mockWriteFile).toHaveBeenCalledWith('/project/.mcp.json.bak', originalJson);

    // Should write migrated config
    const writtenContent = mockWriteFile.mock.calls[1][1];
    const parsed = JSON.parse(writtenContent);

    expect(parsed.mcpServers.rulebook.args).toEqual([
      '-y',
      '@hivehub/rulebook@latest',
      'mcp-server',
    ]);

    // Should preserve other entries
    expect(parsed.mcpServers['other-server']).toEqual({
      command: 'node',
      args: ['server.js'],
    });
  });

  it('should migrate multiple rulebook-* entries', async () => {
    const originalConfig = {
      mcpServers: {
        rulebook: {
          command: 'npx',
          args: [
            '-y',
            '@hivehub/rulebook@latest',
            'mcp-server',
            '--project-root',
            '/abs/path1',
          ],
        },
        'rulebook-memory': {
          command: 'npx',
          args: [
            '-y',
            '@hivehub/rulebook@latest',
            'mcp-server',
            '--project-root',
            '/abs/path2',
          ],
        },
      },
    };

    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(originalConfig));
    mockWriteFile.mockResolvedValue(undefined);

    const result = await migrateMcpJson('/project/.mcp.json');

    expect(result).toBe(true);

    const writtenContent = mockWriteFile.mock.calls[1][1];
    const parsed = JSON.parse(writtenContent);

    expect(parsed.mcpServers.rulebook.args).toEqual([
      '-y',
      '@hivehub/rulebook@latest',
      'mcp-server',
    ]);
    expect(parsed.mcpServers['rulebook-memory'].args).toEqual([
      '-y',
      '@hivehub/rulebook@latest',
      'mcp-server',
    ]);
  });

  it('should not migrate --project-root with relative path', async () => {
    const config = {
      mcpServers: {
        rulebook: {
          command: 'npx',
          args: [
            '-y',
            '@hivehub/rulebook@latest',
            'mcp-server',
            '--project-root',
            './relative',
          ],
        },
      },
    };

    mockFileExists.mockResolvedValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(config));

    const result = await migrateMcpJson('/project/.mcp.json');
    expect(result).toBe(false);
  });
});

describe('migrateLegacyMcpConfigs', () => {
  it('should find and migrate multiple .mcp.json files', async () => {
    const legacyConfig = JSON.stringify({
      mcpServers: {
        rulebook: {
          command: 'npx',
          args: [
            '-y',
            '@hivehub/rulebook@latest',
            'mcp-server',
            '--project-root',
            '/abs/path',
          ],
        },
      },
    });

    const cleanConfig = JSON.stringify({
      mcpServers: {
        rulebook: {
          command: 'npx',
          args: ['-y', '@hivehub/rulebook@latest', 'mcp-server'],
        },
      },
    });

    mockGlob.mockResolvedValue(['/root/a/.mcp.json', '/root/b/.mcp.json'] as never);

    // First file has legacy paths, second does not
    mockFileExists.mockResolvedValue(true);
    mockReadFile
      .mockResolvedValueOnce(legacyConfig) // hasLegacyAbsolutePaths for file a
      .mockResolvedValueOnce(legacyConfig) // migrateMcpJson read for file a
      .mockResolvedValueOnce(legacyConfig) // migrateMcpJson backup read for file a
      .mockResolvedValueOnce(cleanConfig); // hasLegacyAbsolutePaths for file b
    mockWriteFile.mockResolvedValue(undefined);

    const result = await migrateLegacyMcpConfigs('/root');

    expect(result.migratedFiles).toEqual(['/root/a/.mcp.json']);
    expect(result.skippedFiles).toEqual(['/root/b/.mcp.json']);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle glob errors gracefully', async () => {
    mockGlob.mockRejectedValue(new Error('Permission denied'));

    const result = await migrateLegacyMcpConfigs('/root');

    expect(result.migratedFiles).toHaveLength(0);
    expect(result.skippedFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Permission denied');
  });

  it('should skip files with read errors (hasLegacyAbsolutePaths returns false on error)', async () => {
    mockGlob.mockResolvedValue(['/root/a/.mcp.json', '/root/b/.mcp.json'] as never);

    // First file has a read error (hasLegacyAbsolutePaths catches it and returns false)
    // Second file is clean
    mockFileExists.mockResolvedValue(true);
    mockReadFile
      .mockRejectedValueOnce(new Error('Read failed')) // hasLegacyAbsolutePaths catches → false
      .mockResolvedValueOnce(
        JSON.stringify({
          mcpServers: {
            rulebook: {
              command: 'npx',
              args: ['-y', '@hivehub/rulebook@latest', 'mcp-server'],
            },
          },
        })
      ); // hasLegacyAbsolutePaths for b → false (no legacy)

    const result = await migrateLegacyMcpConfigs('/root');

    // Both files are skipped (no legacy paths detected)
    expect(result.errors).toHaveLength(0);
    expect(result.skippedFiles).toEqual(['/root/a/.mcp.json', '/root/b/.mcp.json']);
  });

  it('should return empty result when no .mcp.json files found', async () => {
    mockGlob.mockResolvedValue([] as never);

    const result = await migrateLegacyMcpConfigs('/root');

    expect(result.migratedFiles).toHaveLength(0);
    expect(result.skippedFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should skip files where hasLegacy is true but migrateMcpJson returns false', async () => {
    // This covers lines 56-57: hasLegacyAbsolutePaths returns true on first read,
    // but migrateMcpJson returns false on its own second read (e.g. file changed between reads)
    const legacyConfig = JSON.stringify({
      mcpServers: {
        rulebook: {
          command: 'npx',
          args: ['-y', '@hivehub/rulebook@latest', 'mcp-server', '--project-root', '/abs/path'],
        },
      },
    });

    const noLegacyConfig = JSON.stringify({
      mcpServers: {
        rulebook: {
          command: 'npx',
          args: ['-y', '@hivehub/rulebook@latest', 'mcp-server', '--project-root', './relative'],
        },
      },
    });

    mockGlob.mockResolvedValue(['/root/a/.mcp.json'] as never);
    mockFileExists.mockResolvedValue(true);
    mockReadFile
      .mockResolvedValueOnce(legacyConfig) // hasLegacyAbsolutePaths → true
      .mockResolvedValueOnce(noLegacyConfig); // migrateMcpJson → false (relative path, not abs)

    const result = await migrateLegacyMcpConfigs('/root');

    expect(result.migratedFiles).toHaveLength(0);
    expect(result.skippedFiles).toEqual(['/root/a/.mcp.json']);
    expect(result.errors).toHaveLength(0);
  });

  it('should record errors when migrateMcpJson throws', async () => {
    const legacyConfig = JSON.stringify({
      mcpServers: {
        rulebook: {
          command: 'npx',
          args: ['-y', '@hivehub/rulebook@latest', 'mcp-server', '--project-root', '/abs/path'],
        },
      },
    });

    mockGlob.mockResolvedValue(['/root/a/.mcp.json'] as never);
    mockFileExists.mockResolvedValue(true);
    mockReadFile
      .mockResolvedValueOnce(legacyConfig) // hasLegacyAbsolutePaths → true
      .mockResolvedValueOnce(legacyConfig) // migrateMcpJson read → legacy config
      .mockRejectedValueOnce(new Error('Disk full')); // migrateMcpJson backup read throws

    const result = await migrateLegacyMcpConfigs('/root');

    expect(result.migratedFiles).toHaveLength(0);
    expect(result.skippedFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('/root/a/.mcp.json');
    expect(result.errors[0]).toContain('Disk full');
  });

  it('should pass correct ignore patterns to glob', async () => {
    mockGlob.mockResolvedValue([] as never);

    await migrateLegacyMcpConfigs('/search/root');

    expect(mockGlob).toHaveBeenCalledWith('**/.mcp.json', {
      cwd: '/search/root',
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    });
  });
});
