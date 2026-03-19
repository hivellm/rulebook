import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Tests for session management logic (PLANS.md read/write).
 * These test the core logic without requiring the full MCP server.
 */
describe('Session Management', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `rulebook-session-test-${Date.now()}`);
    mkdirSync(join(testDir, '.rulebook'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('PLANS.md structure', () => {
    it('should have required section markers', () => {
      const template = `# Project Plans & Session Context

<!-- PLANS:CONTEXT:START -->
_No active context._
<!-- PLANS:CONTEXT:END -->

<!-- PLANS:TASK:START -->
_No task in progress._
<!-- PLANS:TASK:END -->

## Session History

<!-- PLANS:HISTORY:START -->
<!-- PLANS:HISTORY:END -->
`;
      writeFileSync(join(testDir, '.rulebook', 'PLANS.md'), template);
      const content = readFileSync(join(testDir, '.rulebook', 'PLANS.md'), 'utf-8');

      expect(content).toContain('<!-- PLANS:CONTEXT:START -->');
      expect(content).toContain('<!-- PLANS:CONTEXT:END -->');
      expect(content).toContain('<!-- PLANS:TASK:START -->');
      expect(content).toContain('<!-- PLANS:TASK:END -->');
      expect(content).toContain('<!-- PLANS:HISTORY:START -->');
      expect(content).toContain('<!-- PLANS:HISTORY:END -->');
    });

    it('should insert session summary after HISTORY:START marker', () => {
      const template = `<!-- PLANS:HISTORY:START -->\n<!-- PLANS:HISTORY:END -->`;
      writeFileSync(join(testDir, '.rulebook', 'PLANS.md'), template);

      // Simulate session end — insert after marker
      let content = readFileSync(join(testDir, '.rulebook', 'PLANS.md'), 'utf-8');
      const entry = `### 2026-03-19\nCompleted v5 implementation.\n`;
      content = content.replace(
        '<!-- PLANS:HISTORY:START -->',
        `<!-- PLANS:HISTORY:START -->\n${entry}`
      );
      writeFileSync(join(testDir, '.rulebook', 'PLANS.md'), content);

      const updated = readFileSync(join(testDir, '.rulebook', 'PLANS.md'), 'utf-8');
      expect(updated).toContain('### 2026-03-19');
      expect(updated).toContain('Completed v5 implementation');
      expect(updated).toContain('<!-- PLANS:HISTORY:END -->');
    });

    it('should preserve existing history entries when adding new ones', () => {
      const template = `<!-- PLANS:HISTORY:START -->\n### 2026-03-18\nOld entry.\n<!-- PLANS:HISTORY:END -->`;
      writeFileSync(join(testDir, '.rulebook', 'PLANS.md'), template);

      let content = readFileSync(join(testDir, '.rulebook', 'PLANS.md'), 'utf-8');
      const entry = `### 2026-03-19\nNew entry.\n`;
      content = content.replace(
        '<!-- PLANS:HISTORY:START -->',
        `<!-- PLANS:HISTORY:START -->\n${entry}`
      );
      writeFileSync(join(testDir, '.rulebook', 'PLANS.md'), content);

      const updated = readFileSync(join(testDir, '.rulebook', 'PLANS.md'), 'utf-8');
      expect(updated).toContain('### 2026-03-18');
      expect(updated).toContain('Old entry');
      expect(updated).toContain('### 2026-03-19');
      expect(updated).toContain('New entry');
    });
  });
});
