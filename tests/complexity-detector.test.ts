import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { assessComplexity } from '../src/core/complexity-detector.js';

describe('Complexity Detector', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `rulebook-complexity-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should return small tier for empty project', () => {
    const result = assessComplexity(testDir);
    expect(result.tier).toBe('small');
    expect(result.score).toBeLessThan(25);
    expect(result.metrics.estimatedLoc).toBe(0);
    expect(result.recommendations.tier1Rules).toBe(true);
    expect(result.recommendations.tier2Rules).toBe(false);
  });

  it('should detect single language project', () => {
    mkdirSync(join(testDir, 'src'), { recursive: true });
    writeFileSync(join(testDir, 'src', 'index.ts'), 'const x = 1;\n'.repeat(100));
    writeFileSync(join(testDir, 'src', 'utils.ts'), 'export function foo() {}\n'.repeat(50));

    const result = assessComplexity(testDir);
    expect(result.metrics.languageCount).toBeGreaterThanOrEqual(1);
    expect(result.metrics.estimatedLoc).toBeGreaterThan(0);
  });

  it('should detect multiple languages', () => {
    mkdirSync(join(testDir, 'src'), { recursive: true });
    writeFileSync(join(testDir, 'src', 'main.ts'), 'const x = 1;\n'.repeat(100));
    writeFileSync(join(testDir, 'src', 'script.py'), 'x = 1\n'.repeat(100));
    writeFileSync(join(testDir, 'src', 'lib.rs'), 'fn main() {}\n'.repeat(100));

    const result = assessComplexity(testDir);
    expect(result.metrics.languageCount).toBeGreaterThanOrEqual(3);
  });

  it('should score higher for more languages', () => {
    mkdirSync(join(testDir, 'src'), { recursive: true });
    writeFileSync(join(testDir, 'src', 'a.ts'), 'x\n'.repeat(500));
    const singleLang = assessComplexity(testDir);

    writeFileSync(join(testDir, 'src', 'b.py'), 'x\n'.repeat(500));
    writeFileSync(join(testDir, 'src', 'c.rs'), 'x\n'.repeat(500));
    const multiLang = assessComplexity(testDir);

    expect(multiLang.score).toBeGreaterThan(singleLang.score);
  });

  it('should count source directories', () => {
    mkdirSync(join(testDir, 'src'), { recursive: true });
    mkdirSync(join(testDir, 'lib'), { recursive: true });
    mkdirSync(join(testDir, 'app'), { recursive: true });

    const result = assessComplexity(testDir);
    expect(result.metrics.sourceDirectories).toBe(3);
  });

  it('should detect claude-code tool', () => {
    mkdirSync(join(testDir, '.claude'), { recursive: true });

    const result = assessComplexity(testDir);
    expect(result.detectedTools).toContain('claude-code');
  });

  it('should detect cursor tool', () => {
    mkdirSync(join(testDir, '.cursor'), { recursive: true });

    const result = assessComplexity(testDir);
    expect(result.detectedTools).toContain('cursor');
  });

  it('should detect multiple tools', () => {
    mkdirSync(join(testDir, '.claude'), { recursive: true });
    mkdirSync(join(testDir, '.cursor'), { recursive: true });
    writeFileSync(join(testDir, 'GEMINI.md'), '# Gemini rules');

    const result = assessComplexity(testDir);
    expect(result.detectedTools).toContain('claude-code');
    expect(result.detectedTools).toContain('cursor');
    expect(result.detectedTools).toContain('gemini');
  });

  it('should detect custom MCP server', () => {
    writeFileSync(join(testDir, '.mcp.json'), '{}');

    const result = assessComplexity(testDir);
    expect(result.metrics.hasCustomMcpServer).toBe(true);
  });

  it('should always recommend tier1Rules', () => {
    const result = assessComplexity(testDir);
    expect(result.recommendations.tier1Rules).toBe(true);
  });

  it('should recommend tier2Rules for medium+ projects', () => {
    mkdirSync(join(testDir, 'src'), { recursive: true });
    // Create enough files to push past small tier
    for (let i = 0; i < 50; i++) {
      writeFileSync(join(testDir, 'src', `file${i}.ts`), `const x = ${i};\n`.repeat(200));
    }
    writeFileSync(join(testDir, 'src', 'main.py'), 'x = 1\n'.repeat(200));

    const result = assessComplexity(testDir);
    expect(['medium', 'large', 'complex']).toContain(result.tier);
    expect(result.recommendations.tier2Rules).toBe(true);
  });

  it('should ignore node_modules directory', () => {
    mkdirSync(join(testDir, 'node_modules', 'foo'), { recursive: true });
    writeFileSync(join(testDir, 'node_modules', 'foo', 'index.js'), 'x\n'.repeat(10000));
    mkdirSync(join(testDir, 'src'), { recursive: true });
    writeFileSync(join(testDir, 'src', 'app.ts'), 'const x = 1;\n'.repeat(10));

    const result = assessComplexity(testDir);
    // LOC should be small (only src/app.ts counted, not node_modules)
    expect(result.metrics.estimatedLoc).toBeLessThan(1000);
  });

  it('should ignore .git directory', () => {
    mkdirSync(join(testDir, '.git', 'objects'), { recursive: true });
    writeFileSync(join(testDir, '.git', 'objects', 'pack.js'), 'x\n'.repeat(5000));

    const result = assessComplexity(testDir);
    expect(result.metrics.estimatedLoc).toBe(0);
  });
});
