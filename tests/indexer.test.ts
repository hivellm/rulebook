import * as fs from 'fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeParser } from '../src/core/indexer/file-parser.js';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    statSync: vi.fn(),
  };
});

describe('CodeParser', () => {
  const parser = new CodeParser();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly parse a simple TypeScript file and extract imports', () => {
    const mockFilePath = 'src/example.ts';
    const mockContent = `
import { Foo } from './foo';
import Bar from '../utils/bar';

export class ExampleClass {
    constructor() {
        console.log('hi');
    }
}

export function helperCmd() {
    return true;
}
        `.trim();

    // 1. Mock the stat size and read contents
    (fs.statSync as any).mockReturnValue({ size: mockContent.length });
    (fs.readFileSync as any).mockReturnValue(mockContent);

    // 2. Execute parser
    const { nodes, edges } = parser.parseFile(mockFilePath);

    // 3. Assertions

    // Assert File Node + 2 Chunks (Class & Function) + possible chunks depending on lines size
    expect(nodes.length).toBeGreaterThanOrEqual(1);

    const fileNode = nodes.find((n) => n.type === 'file');
    expect(fileNode).toBeDefined();
    expect(fileNode!.name).toBe('example.ts');

    // Assert that imports were extracted correctly into edges
    expect(edges).toHaveLength(2);
    expect(edges.some((e) => e.targetId === '__module__./foo')).toBe(true);
    expect(edges.some((e) => e.targetId === '__module__../utils/bar')).toBe(true);

    const hasClassContent = nodes.some((n) => n.content.includes('ExampleClass'));
    expect(hasClassContent).toBe(true);

    const hasFunctionContent = nodes.some((n) => n.content.includes('helperCmd'));
    expect(hasFunctionContent).toBe(true);
  });

  it('should ignore files larger than 1MB', () => {
    (fs.statSync as any).mockReturnValue({ size: 2 * 1024 * 1024 }); // 2MB
    const { nodes, edges } = parser.parseFile('huge.ts');

    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
    // Should not have called readFileSync
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });
});
