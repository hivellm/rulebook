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
  let parser: CodeParser;

  beforeEach(() => {
    parser = new CodeParser();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // generateHash (public method)
  // -------------------------------------------------------------------------

  describe('generateHash', () => {
    it('should return a hex string for any content', () => {
      const hash = parser.generateHash('hello world');
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should return the same hash for the same content', () => {
      const hash1 = parser.generateHash('consistent content');
      const hash2 = parser.generateHash('consistent content');
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different content', () => {
      const hash1 = parser.generateHash('content A');
      const hash2 = parser.generateHash('content B');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string input', () => {
      const hash = parser.generateHash('');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });
  });

  // -------------------------------------------------------------------------
  // parseFile — guard conditions
  // -------------------------------------------------------------------------

  describe('parseFile — guard conditions', () => {
    it('should return empty nodes/edges for files larger than 1MB', () => {
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: 2 * 1024 * 1024 });
      const result = parser.parseFile('big.ts');
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('should return empty nodes/edges when statSync throws', () => {
      (fs.statSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('ENOENT');
      });
      const result = parser.parseFile('nonexistent.ts');
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should return empty nodes/edges when readFileSync throws', () => {
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: 100 });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('EACCES');
      });
      const result = parser.parseFile('unreadable.ts');
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it('should accept files at exactly 1MB (boundary)', () => {
      const content = 'x'.repeat(100);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: 1024 * 1024 });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const result = parser.parseFile('boundary.ts');
      // Not skipped — file should be parsed
      expect(result.nodes.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // parseFile — TypeScript/JavaScript dispatch (.ts, .js, .tsx, .jsx)
  // -------------------------------------------------------------------------

  describe('parseFile — TypeScript/JavaScript files', () => {
    const mockSmallContent = `import { A } from './a';\nexport class Foo {}\n`;

    beforeEach(() => {
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: mockSmallContent.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(mockSmallContent);
    });

    it('should dispatch .ts files to parseTypeScript', () => {
      const result = parser.parseFile('src/foo.ts');
      const fileNode = result.nodes.find((n) => n.type === 'file');
      expect(fileNode).toBeDefined();
      expect(fileNode!.name).toBe('foo.ts');
    });

    it('should dispatch .js files to parseTypeScript', () => {
      const result = parser.parseFile('src/foo.js');
      const fileNode = result.nodes.find((n) => n.type === 'file');
      expect(fileNode).toBeDefined();
      expect(fileNode!.name).toBe('foo.js');
    });

    it('should dispatch .tsx files to parseTypeScript', () => {
      const result = parser.parseFile('src/Component.tsx');
      const fileNode = result.nodes.find((n) => n.type === 'file');
      expect(fileNode).toBeDefined();
      expect(fileNode!.name).toBe('Component.tsx');
    });

    it('should dispatch .jsx files to parseTypeScript', () => {
      const result = parser.parseFile('src/Component.jsx');
      const fileNode = result.nodes.find((n) => n.type === 'file');
      expect(fileNode).toBeDefined();
      expect(fileNode!.name).toBe('Component.jsx');
    });

    it('should create import edges for each import statement', () => {
      const content = `import { A } from './a';\nimport B from '../b';\nimport { C } from 'external';\n`;
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      const { edges } = parser.parseFile('src/multi-import.ts');
      expect(edges).toHaveLength(3);
      expect(edges.some((e) => e.targetId === '__module__./a')).toBe(true);
      expect(edges.some((e) => e.targetId === '__module__../b')).toBe(true);
      expect(edges.some((e) => e.targetId === '__module__external')).toBe(true);
    });

    it('should produce no import edges when content has no imports', () => {
      const content = `export class Empty {}\n`;
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      const { edges } = parser.parseFile('src/empty.ts');
      expect(edges).toHaveLength(0);
    });

    it('should set edge type to imports and weight to 1.0', () => {
      const content = `import { X } from './x';\n`;
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      const { edges } = parser.parseFile('src/x.ts');
      expect(edges[0].type).toBe('imports');
      expect(edges[0].weight).toBe(1.0);
    });

    it('should generate unique UUIDs for each edge id', () => {
      const content = `import { A } from './a';\nimport { B } from './b';\n`;
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      const { edges } = parser.parseFile('src/uuids.ts');
      expect(edges[0].id).not.toBe(edges[1].id);
    });

    it('should set file node filePath to the provided path', () => {
      const result = parser.parseFile('deep/nested/foo.ts');
      const fileNode = result.nodes.find((n) => n.type === 'file');
      expect(fileNode!.filePath).toBe('deep/nested/foo.ts');
    });

    it('should set file node startLine to 1 and endLine to total lines', () => {
      const content = 'line1\nline2\nline3\n';
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      const { nodes } = parser.parseFile('src/lines.ts');
      const fileNode = nodes.find((n) => n.type === 'file');
      expect(fileNode!.startLine).toBe(1);
      expect(fileNode!.endLine).toBe(content.split('\n').length);
    });

    it('should set file node content to the full file content', () => {
      const content = `import { A } from './a';\nexport class Foo {}\n`;
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      const { nodes } = parser.parseFile('src/content.ts');
      const fileNode = nodes.find((n) => n.type === 'file');
      expect(fileNode!.content).toBe(content);
    });

    it('should set file node hash equal to generateHash of content', () => {
      const content = `export const x = 1;\n`;
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      const { nodes } = parser.parseFile('src/hash.ts');
      const fileNode = nodes.find((n) => n.type === 'file');
      expect(fileNode!.hash).toBe(parser.generateHash(content));
    });
  });

  // -------------------------------------------------------------------------
  // parseFile — TypeScript chunking (content >= CHUNK_SIZE = 1500 chars)
  // -------------------------------------------------------------------------

  describe('parseFile — TypeScript chunking', () => {
    it('should create chunk nodes when content exceeds CHUNK_SIZE', () => {
      // Generate content that is clearly over 1500 chars across many lines
      const longLine = 'const x = ' + 'a'.repeat(100) + ';\n';
      const content = longLine.repeat(20); // ~2200 chars
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('src/long.ts');
      const chunkNodes = nodes.filter((n) => n.type === 'chunk');
      expect(chunkNodes.length).toBeGreaterThan(0);
    });

    it('should create a chunk-end node for remaining content under CHUNK_SIZE', () => {
      // Content exactly less than 1500 chars so it all flushes as chunk-end
      const content = 'export const y = 42;\n'.repeat(5); // ~105 chars
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('src/short.ts');
      const endChunk = nodes.find((n) => n.name === 'chunk-end');
      expect(endChunk).toBeDefined();
    });

    it('should not create chunk-end node when content trims to empty', () => {
      // An empty file produces no chunk-end node (only the file node)
      const content = '';
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: 0 });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('src/empty.ts');
      // Only the file node exists; no chunk-end since trim() === ''
      expect(nodes.filter((n) => n.name === 'chunk-end')).toHaveLength(0);
    });

    it('should use matchName as chunk name when a class/function header is detected', () => {
      // Build content: lots of filler, then exactly at chunk boundary a class line
      const filler = 'const x = 1;\n'.repeat(120); // >1500 chars
      const content = filler + 'export class MyClass {}\n';
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('src/named.ts');
      // The chunk that is flushed when length >= 1500 should be named after the filler chunk
      // The end chunk should contain the class content
      expect(nodes.some((n) => n.content.includes('MyClass'))).toBe(true);
    });

    it('should label chunk node names with chunk-<lineIndex> when no class/function name found', () => {
      const longLine = 'const z = ' + 'b'.repeat(100) + ';\n';
      const content = longLine.repeat(20);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('src/unnamed.ts');
      const chunkNodes = nodes.filter((n) => n.type === 'chunk' && n.name.startsWith('chunk-'));
      expect(chunkNodes.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // parseFile — Markdown (.md)
  // -------------------------------------------------------------------------

  describe('parseFile — Markdown files', () => {
    beforeEach(() => {
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: 200 });
    });

    it('should dispatch .md files to parseMarkdown and return no edges', () => {
      const content = '# Title\nSome body text.\n';
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const result = parser.parseFile('README.md');
      expect(result.edges).toHaveLength(0);
    });

    it('should create a section node for content before the first heading', () => {
      const content = 'intro text\n# Heading One\nbody\n';
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('doc.md');
      expect(nodes.some((n) => n.content.includes('intro text'))).toBe(true);
    });

    it('should split on ## headings as well as # headings', () => {
      const content = '## Section A\ntext A\n## Section B\ntext B\n';
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('doc.md');
      // Two sections => each gets its own node
      expect(nodes.length).toBeGreaterThanOrEqual(2);
    });

    it('should flush remaining content as md-end when not a heading start', () => {
      const content = '# Title\nsome content\n';
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('doc.md');
      expect(nodes.some((n) => n.name === 'md-end')).toBe(true);
    });

    it('should return no nodes for an empty markdown file', () => {
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('');
      const { nodes } = parser.parseFile('empty.md');
      expect(nodes).toHaveLength(0);
    });

    it('should return no nodes for a whitespace-only markdown file', () => {
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('   \n\n   \n');
      const { nodes } = parser.parseFile('whitespace.md');
      expect(nodes).toHaveLength(0);
    });

    it('should create md-chunk nodes when a section exceeds CHUNK_SIZE * 2 (3000 chars)', () => {
      const bigSection = '# Big Section\n' + 'word '.repeat(700); // ~3500 chars
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: bigSection.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(bigSection);
      const { nodes } = parser.parseFile('huge.md');
      expect(nodes.some((n) => n.name.startsWith('md-chunk-'))).toBe(true);
    });

    it('should set node type to unknown for markdown nodes', () => {
      const content = '# Title\nsome text\n';
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('doc.md');
      expect(nodes.every((n) => n.type === 'unknown')).toBe(true);
    });

    it('should use md-section-<startLine> as node name for section nodes', () => {
      const content = '# First\ntext\n## Second\nmore text\n';
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('sections.md');
      expect(nodes.some((n) => n.name.startsWith('md-section-'))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // parseFile — Naive (all other extensions)
  // -------------------------------------------------------------------------

  describe('parseFile — Naive / unknown extension files', () => {
    it('should parse .py files using naive chunking', () => {
      const content = 'def hello():\n    pass\n';
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const result = parser.parseFile('script.py');
      expect(result.edges).toHaveLength(0);
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    it('should parse .rs files using naive chunking', () => {
      const content = 'fn main() {\n    println!("hello");\n}\n';
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const result = parser.parseFile('main.rs');
      expect(result.edges).toHaveLength(0);
    });

    it('should return no nodes for an empty naive file', () => {
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: 0 });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('');
      const { nodes } = parser.parseFile('empty.py');
      expect(nodes).toHaveLength(0);
    });

    it('should return no nodes for whitespace-only naive file', () => {
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: 10 });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('   \n\n   \n');
      const { nodes } = parser.parseFile('whitespace.py');
      expect(nodes).toHaveLength(0);
    });

    it('should create chunk nodes when naive content exceeds CHUNK_SIZE', () => {
      const line = 'x = ' + '1'.repeat(100) + '\n';
      const content = line.repeat(20); // ~2100 chars
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('long.py');
      expect(nodes.some((n) => n.name.startsWith('chunk-'))).toBe(true);
    });

    it('should create chunk-end node for remaining content in naive parse', () => {
      const content = 'short content\n';
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('small.py');
      expect(nodes.some((n) => n.name === 'chunk-end')).toBe(true);
    });

    it('should use type unknown for all naive chunk nodes', () => {
      const content = 'some code\n';
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('code.go');
      expect(nodes.every((n) => n.type === 'unknown')).toBe(true);
    });

    it('should set correct filePath on naive chunk nodes', () => {
      const content = 'data\n';
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('dir/file.rb');
      expect(nodes.every((n) => n.filePath === 'dir/file.rb')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // createNode — via parseFile (indirect), checking node structure
  // -------------------------------------------------------------------------

  describe('node structure from createNode', () => {
    it('should produce nodes with id, type, name, filePath, startLine, endLine, content, hash, updatedAt', () => {
      const content = 'export const z = 99;\n';
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('src/struct.ts');
      const chunkEnd = nodes.find((n) => n.name === 'chunk-end');
      expect(chunkEnd).toBeDefined();
      expect(chunkEnd!.id).toMatch(/^[a-f0-9]{32}$/); // md5 hex
      expect(chunkEnd!.type).toBe('chunk');
      expect(chunkEnd!.name).toBe('chunk-end');
      expect(chunkEnd!.filePath).toBe('src/struct.ts');
      expect(chunkEnd!.startLine).toBeGreaterThanOrEqual(1);
      expect(chunkEnd!.endLine).toBeGreaterThanOrEqual(1);
      expect(typeof chunkEnd!.content).toBe('string');
      expect(chunkEnd!.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(typeof chunkEnd!.updatedAt).toBe('number');
    });

    it('should produce deterministic ids based on filePath and line range', () => {
      const content = 'export const a = 1;\n';
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes: nodes1 } = parser.parseFile('src/determ.ts');
      const { nodes: nodes2 } = parser.parseFile('src/determ.ts');
      const chunk1 = nodes1.find((n) => n.name === 'chunk-end');
      const chunk2 = nodes2.find((n) => n.name === 'chunk-end');
      expect(chunk1!.id).toBe(chunk2!.id);
    });

    it('should produce different ids for different file paths with same content', () => {
      const content = 'export const b = 2;\n';
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes: nodes1 } = parser.parseFile('src/file1.ts');
      const { nodes: nodes2 } = parser.parseFile('src/file2.ts');
      const chunk1 = nodes1.find((n) => n.name === 'chunk-end');
      const chunk2 = nodes2.find((n) => n.name === 'chunk-end');
      expect(chunk1!.id).not.toBe(chunk2!.id);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases: file path with backslashes (Windows paths)
  // -------------------------------------------------------------------------

  describe('parseFile — Windows-style paths', () => {
    it('should extract file name from backslash-separated Windows path', () => {
      const content = 'export const w = 1;\n';
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('C:\\Users\\user\\project\\src\\win.ts');
      const fileNode = nodes.find((n) => n.type === 'file');
      expect(fileNode!.name).toBe('win.ts');
    });
  });

  // -------------------------------------------------------------------------
  // parseFile — export function regex detection
  // -------------------------------------------------------------------------

  describe('parseFile — TypeScript export function detection', () => {
    it('should detect export async function', () => {
      const content = `export async function fetchData() {\n  return {};\n}\n`;
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('src/async.ts');
      expect(nodes.some((n) => n.content.includes('fetchData'))).toBe(true);
    });

    it('should detect export class declaration', () => {
      const content = `export class MyService {\n  run() {}\n}\n`;
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({ size: content.length });
      (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(content);
      const { nodes } = parser.parseFile('src/service.ts');
      expect(nodes.some((n) => n.content.includes('MyService'))).toBe(true);
    });
  });
});
