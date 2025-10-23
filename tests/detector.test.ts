import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectProject } from '../src/core/detector';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('detector', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('detectProject', () => {
    it('should detect Rust project with Cargo.toml', async () => {
      await fs.writeFile(path.join(testDir, 'Cargo.toml'), '[package]\nname = "test"');
      await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'src', 'main.rs'), 'fn main() {}');

      const result = await detectProject(testDir);

      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].language).toBe('rust');
      expect(result.languages[0].confidence).toBeGreaterThan(0.8);
      expect(result.languages[0].indicators).toContain('Cargo.toml');
    });

    it('should detect TypeScript project with package.json and tsconfig', async () => {
      await fs.writeFile(path.join(testDir, 'package.json'), '{"name": "test"}');
      await fs.writeFile(path.join(testDir, 'tsconfig.json'), '{}');
      await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'src', 'index.ts'), 'console.log("test")');

      const result = await detectProject(testDir);

      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].language).toBe('typescript');
      expect(result.languages[0].indicators).toContain('package.json');
      expect(result.languages[0].indicators).toContain('tsconfig.json');
    });

    it('should detect Python project with pyproject.toml', async () => {
      await fs.writeFile(path.join(testDir, 'pyproject.toml'), '[tool.poetry]\nname = "test"');
      await fs.writeFile(path.join(testDir, 'main.py'), 'print("test")');

      const result = await detectProject(testDir);

      expect(result.languages).toHaveLength(1);
      expect(result.languages[0].language).toBe('python');
      expect(result.languages[0].indicators).toContain('pyproject.toml');
    });

    it('should detect multiple languages', async () => {
      await fs.writeFile(path.join(testDir, 'Cargo.toml'), '[package]\nname = "test"');
      await fs.writeFile(path.join(testDir, 'package.json'), '{"name": "test"}');
      await fs.writeFile(path.join(testDir, 'src', 'main.rs'), 'fn main() {}');
      await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'src', 'index.ts'), 'console.log("test")');

      const result = await detectProject(testDir);

      expect(result.languages.length).toBeGreaterThanOrEqual(2);
      const languages = result.languages.map((l) => l.language);
      expect(languages).toContain('rust');
      expect(languages).toContain('typescript');
    });

    it('should detect Vectorizer module from MCP config', async () => {
      const mcpConfig = {
        mcpServers: {
          vectorizer: {
            command: 'mcp-vectorizer',
          },
        },
      };
      await fs.writeFile(path.join(testDir, 'mcp.json'), JSON.stringify(mcpConfig, null, 2));

      const result = await detectProject(testDir);

      const vectorizer = result.modules.find((m) => m.module === 'vectorizer');
      expect(vectorizer).toBeDefined();
      expect(vectorizer?.detected).toBe(true);
    });

    it('should detect existing AGENTS.md', async () => {
      const agentsContent = `<!-- RULEBOOK:START -->
# Project Rules
<!-- RULEBOOK:END -->

<!-- RUST:START -->
# Rust Rules
<!-- RUST:END -->`;
      await fs.writeFile(path.join(testDir, 'AGENTS.md'), agentsContent);

      const result = await detectProject(testDir);

      expect(result.existingAgents).not.toBeNull();
      expect(result.existingAgents?.exists).toBe(true);
      expect(result.existingAgents?.blocks).toHaveLength(2);
      expect(result.existingAgents?.blocks[0].name).toBe('RULEBOOK');
      expect(result.existingAgents?.blocks[1].name).toBe('RUST');
    });

    it('should return empty arrays when no project detected', async () => {
      const result = await detectProject(testDir);

      expect(result.languages).toEqual([]);
      expect(result.modules.every((m) => !m.detected)).toBe(true);
      expect(result.existingAgents).toBeNull();
    });
  });
});

