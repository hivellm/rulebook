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

  it('should detect continue tool when .continue directory exists', () => {
    mkdirSync(join(testDir, '.continue'), { recursive: true });

    const result = assessComplexity(testDir);
    expect(result.detectedTools).toContain('continue');
  });

  it('should detect windsurf tool when .windsurfrules file exists', () => {
    writeFileSync(join(testDir, '.windsurfrules'), '# Windsurf rules');

    const result = assessComplexity(testDir);
    expect(result.detectedTools).toContain('windsurf');
  });

  it('should detect windsurf tool when .windsurf directory exists', () => {
    mkdirSync(join(testDir, '.windsurf'), { recursive: true });

    const result = assessComplexity(testDir);
    expect(result.detectedTools).toContain('windsurf');
  });

  it('should detect claude-code tool when CLAUDE.md file exists', () => {
    writeFileSync(join(testDir, 'CLAUDE.md'), '# Claude instructions');

    const result = assessComplexity(testDir);
    expect(result.detectedTools).toContain('claude-code');
  });

  it('should detect copilot tool when copilot-instructions.md exists', () => {
    mkdirSync(join(testDir, '.github'), { recursive: true });
    writeFileSync(join(testDir, '.github', 'copilot-instructions.md'), '# Copilot');

    const result = assessComplexity(testDir);
    expect(result.detectedTools).toContain('copilot');
  });

  it('should return complex tier when score is >= 60', () => {
    // Score breakdown:
    //   LOC < 10K => +10
    //   5 languages (capped at 3 * 10 = 30) => +30
    //   5 source dirs (5 * 3 = 15, capped at 15) => +15
    //   hasMultipleBuildTargets => +10
    //   hasCustomMcpServer => +5
    //   Total = 70 >= 60 => complex
    const srcDirs = ['src', 'lib', 'app', 'server', 'client'];
    for (const d of srcDirs) {
      mkdirSync(join(testDir, d), { recursive: true });
    }
    // 5 distinct languages
    writeFileSync(join(testDir, 'src', 'a.ts'), 'x\n');
    writeFileSync(join(testDir, 'src', 'b.py'), 'x\n');
    writeFileSync(join(testDir, 'src', 'c.rs'), 'x\n');
    writeFileSync(join(testDir, 'src', 'd.go'), 'x\n');
    writeFileSync(join(testDir, 'src', 'e.java'), 'x\n');
    // multiple build targets: Cargo.toml + package.json
    writeFileSync(join(testDir, 'Cargo.toml'), '[package]');
    writeFileSync(join(testDir, 'package.json'), '{}');
    // custom MCP server
    writeFileSync(join(testDir, '.mcp.json'), '{}');

    const result = assessComplexity(testDir);
    expect(result.tier).toBe('complex');
    expect(result.recommendations.referenceWorkflow).toBe(true);
    expect(result.recommendations.dataFlowPlanning).toBe(true);
  });

  it('should return medium tier when score is >= 25 but < 40', () => {
    // Score: small LOC (+10) + 2 languages (+20) = 30, which is >= 25 and < 40 => medium
    mkdirSync(join(testDir, 'src'), { recursive: true });
    writeFileSync(join(testDir, 'src', 'a.ts'), 'x\n');
    writeFileSync(join(testDir, 'src', 'b.py'), 'x\n');

    const result = assessComplexity(testDir);
    expect(result.tier).toBe('medium');
    expect(result.recommendations.tier2Rules).toBe(true);
    expect(result.recommendations.specializedAgents).toBe(false);
  });

  it('should return large tier when score is >= 40 but < 60', () => {
    // Score: small LOC (+10) + 3 languages (+30) + 1 source dir (+3) = 43 => large
    mkdirSync(join(testDir, 'src'), { recursive: true });
    writeFileSync(join(testDir, 'src', 'a.ts'), 'x\n');
    writeFileSync(join(testDir, 'src', 'b.py'), 'x\n');
    writeFileSync(join(testDir, 'src', 'c.rs'), 'x\n');

    const result = assessComplexity(testDir);
    expect(result.tier).toBe('large');
    expect(result.recommendations.specializedAgents).toBe(true);
    expect(result.recommendations.teamCoordination).toBe(true);
    expect(result.recommendations.blockerTracking).toBe(true);
    expect(result.recommendations.referenceWorkflow).toBe(false);
  });

  it('should detect multiple build targets when CMakeLists.txt and package.json exist', () => {
    writeFileSync(join(testDir, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.0)');
    writeFileSync(join(testDir, 'package.json'), '{}');

    const result = assessComplexity(testDir);
    expect(result.metrics.hasMultipleBuildTargets).toBe(true);
  });

  it('should detect multiple build targets when build.zig and package.json exist', () => {
    writeFileSync(join(testDir, 'build.zig'), 'const std = @import("std");');
    writeFileSync(join(testDir, 'package.json'), '{}');

    const result = assessComplexity(testDir);
    expect(result.metrics.hasMultipleBuildTargets).toBe(true);
  });

  it('should detect custom MCP server via mcp.json (non-dot variant)', () => {
    writeFileSync(join(testDir, 'mcp.json'), '{}');

    const result = assessComplexity(testDir);
    expect(result.metrics.hasCustomMcpServer).toBe(true);
  });

  it('should extrapolate LOC when file count exceeds sample limit of 500', () => {
    // Create 600 TypeScript files to exceed the 500-file sample cap.
    // The estimateLoc function will extrapolate from the sample.
    mkdirSync(join(testDir, 'src'), { recursive: true });
    for (let i = 0; i < 600; i++) {
      writeFileSync(join(testDir, 'src', `file${i}.ts`), 'const x = 1;\nconst y = 2;\n');
    }

    const result = assessComplexity(testDir);
    // Extrapolated LOC should be > 0 and reflect the 600 files
    expect(result.metrics.estimatedLoc).toBeGreaterThan(0);
    // With 600 files of ~2 lines each, extrapolated value should be substantial
    expect(result.metrics.estimatedLoc).toBeGreaterThanOrEqual(1000);
  });
});
