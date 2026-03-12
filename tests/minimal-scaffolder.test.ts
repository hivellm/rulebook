import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

vi.mock('../src/utils/file-system.js', () => ({
  ensureDir: vi.fn(),
  fileExists: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('../src/core/docs-generator.js', () => ({
  generateDocsStructure: vi.fn(),
}));

import { ensureDir, fileExists, writeFile } from '../src/utils/file-system';
import { generateDocsStructure } from '../src/core/docs-generator';
import { scaffoldMinimalProject } from '../src/core/minimal-scaffolder';

const mockEnsureDir = vi.mocked(ensureDir);
const mockFileExists = vi.mocked(fileExists);
const mockWriteFile = vi.mocked(writeFile);
const mockGenerateDocsStructure = vi.mocked(generateDocsStructure);

beforeEach(() => {
  vi.resetAllMocks();
  mockEnsureDir.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
});

describe('scaffoldMinimalProject', () => {
  const projectDir = '/tmp/test-project';

  it('should use path.basename as default project name when no options provided', async () => {
    mockGenerateDocsStructure.mockResolvedValue(['/tmp/test-project/README.md']);
    mockFileExists.mockResolvedValue(false);

    await scaffoldMinimalProject(projectDir);

    expect(mockGenerateDocsStructure).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: 'test-project',
        description: 'test-project project bootstrapped with Rulebook minimal mode.',
        author: 'Project Team',
        license: 'MIT',
      }),
      projectDir,
      'minimal'
    );
  });

  it('should use custom projectName, description, and license when provided', async () => {
    mockGenerateDocsStructure.mockResolvedValue([]);
    mockFileExists.mockResolvedValue(false);

    await scaffoldMinimalProject(projectDir, {
      projectName: 'my-app',
      description: 'A custom description',
      license: 'Apache-2.0',
    });

    expect(mockGenerateDocsStructure).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: 'my-app',
        description: 'A custom description',
        license: 'Apache-2.0',
      }),
      projectDir,
      'minimal'
    );
  });

  it('should include docs files from generateDocsStructure in result', async () => {
    const docsFiles = ['/tmp/test-project/README.md', '/tmp/test-project/docs/specs/.gitkeep'];
    mockGenerateDocsStructure.mockResolvedValue(docsFiles);
    mockFileExists.mockResolvedValue(false);

    const result = await scaffoldMinimalProject(projectDir);

    expect(result).toContain('/tmp/test-project/README.md');
    expect(result).toContain('/tmp/test-project/docs/specs/.gitkeep');
  });

  it('should create LICENSE file when it does not exist', async () => {
    mockGenerateDocsStructure.mockResolvedValue([]);
    mockFileExists.mockResolvedValue(false);

    const result = await scaffoldMinimalProject(projectDir);

    const licensePath = path.join(projectDir, 'LICENSE');
    expect(mockWriteFile).toHaveBeenCalledWith(
      licensePath,
      expect.stringContaining('Apache License')
    );
    expect(result).toContain(licensePath);
  });

  it('should NOT create LICENSE file when it already exists', async () => {
    mockGenerateDocsStructure.mockResolvedValue([]);
    // First call: LICENSE exists. Second call: .gitkeep does not exist
    mockFileExists
      .mockResolvedValueOnce(true) // LICENSE exists
      .mockResolvedValueOnce(false); // .gitkeep does not exist

    const result = await scaffoldMinimalProject(projectDir);

    const licensePath = path.join(projectDir, 'LICENSE');
    // writeFile should only be called for .gitkeep, not LICENSE
    const writeFileCalls = mockWriteFile.mock.calls.map((call) => call[0]);
    expect(writeFileCalls).not.toContain(licensePath);
    expect(result).not.toContain(licensePath);
  });

  it('should create tests directory and .gitkeep when it does not exist', async () => {
    mockGenerateDocsStructure.mockResolvedValue([]);
    mockFileExists.mockResolvedValue(false);

    const result = await scaffoldMinimalProject(projectDir);

    const testsDir = path.join(projectDir, 'tests');
    const gitkeepPath = path.join(testsDir, '.gitkeep');
    expect(mockEnsureDir).toHaveBeenCalledWith(testsDir);
    expect(mockWriteFile).toHaveBeenCalledWith(gitkeepPath, '');
    expect(result).toContain(gitkeepPath);
  });

  it('should NOT create .gitkeep when it already exists', async () => {
    mockGenerateDocsStructure.mockResolvedValue([]);
    // First call: LICENSE does not exist. Second call: .gitkeep exists
    mockFileExists
      .mockResolvedValueOnce(false) // LICENSE does not exist
      .mockResolvedValueOnce(true); // .gitkeep exists

    const result = await scaffoldMinimalProject(projectDir);

    const gitkeepPath = path.join(projectDir, 'tests', '.gitkeep');
    // writeFile should only be called for LICENSE, not .gitkeep
    const writeFileCalls = mockWriteFile.mock.calls.map((call) => call[0]);
    expect(writeFileCalls).not.toContain(gitkeepPath);
    expect(result).not.toContain(gitkeepPath);
  });

  it('should deduplicate generated files', async () => {
    const licensePath = path.join(projectDir, 'LICENSE');
    // Simulate docs-generator returning a path that also gets generated later
    mockGenerateDocsStructure.mockResolvedValue([licensePath]);
    mockFileExists.mockResolvedValue(false);

    const result = await scaffoldMinimalProject(projectDir);

    // LICENSE appears from docs AND from the LICENSE creation step
    // Array.from(new Set(...)) should deduplicate
    const licenseCount = result.filter((f) => f === licensePath).length;
    expect(licenseCount).toBe(1);
  });

  it('should return empty array when docs returns nothing and all files exist', async () => {
    mockGenerateDocsStructure.mockResolvedValue([]);
    mockFileExists.mockResolvedValue(true); // Both LICENSE and .gitkeep exist

    const result = await scaffoldMinimalProject(projectDir);

    expect(result).toEqual([]);
  });

  it('should always ensure the tests directory exists', async () => {
    mockGenerateDocsStructure.mockResolvedValue([]);
    mockFileExists.mockResolvedValue(true);

    await scaffoldMinimalProject(projectDir);

    expect(mockEnsureDir).toHaveBeenCalledWith(path.join(projectDir, 'tests'));
  });
});
