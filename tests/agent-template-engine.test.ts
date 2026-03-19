import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadAgentTemplates,
  generateAgents,
  listProjectTypes,
} from '../src/core/agent-template-engine.js';

describe('Agent Template Engine', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `rulebook-agent-engine-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // ── loadAgentTemplates ──────────────────────────────────────────

  describe('loadAgentTemplates', () => {
    it('should load generic templates', async () => {
      const templates = await loadAgentTemplates('generic');
      expect(templates.length).toBeGreaterThan(0);
      const names = templates.map((t) => t.name);
      expect(names).toContain('researcher');
      expect(names).toContain('test-engineer');
      expect(names).toContain('project-manager');
    });

    it('should load generic + project-type templates for web-app', async () => {
      const templates = await loadAgentTemplates('web-app');
      const names = templates.map((t) => t.name);
      // Should have generic agents
      expect(names).toContain('researcher');
      // Should have web-app specific agents
      expect(names).toContain('frontend-engineer');
      expect(names).toContain('backend-engineer');
    });

    it('should load generic + game-engine templates', async () => {
      const templates = await loadAgentTemplates('game-engine');
      const names = templates.map((t) => t.name);
      expect(names).toContain('researcher');
      expect(names).toContain('shader-engineer');
      expect(names).toContain('cpp-core-expert');
    });

    it('should load generic + compiler templates', async () => {
      const templates = await loadAgentTemplates('compiler');
      const names = templates.map((t) => t.name);
      expect(names).toContain('researcher');
      expect(names).toContain('codegen-debugger');
      expect(names).toContain('stdlib-engineer');
    });

    it('should load generic + mobile templates', async () => {
      const templates = await loadAgentTemplates('mobile');
      const names = templates.map((t) => t.name);
      expect(names).toContain('researcher');
      expect(names).toContain('platform-specialist');
      expect(names).toContain('ui-engineer');
    });

    it('should parse template frontmatter correctly', async () => {
      const templates = await loadAgentTemplates('generic');
      const researcher = templates.find((t) => t.name === 'researcher');
      expect(researcher).toBeDefined();
      expect(researcher!.tier).toBe('research');
      expect(researcher!.model).toBe('haiku');
      expect(researcher!.domain).toBe('research');
      expect(researcher!.body).toContain('codebase researcher');
    });

    it('should parse checklists from templates', async () => {
      const templates = await loadAgentTemplates('game-engine');
      const shader = templates.find((t) => t.name === 'shader-engineer');
      expect(shader).toBeDefined();
      expect(shader!.checklist.length).toBeGreaterThan(0);
      expect(shader!.checklist[0]).toContain('reference source');
    });
  });

  // ── generateAgents ──────────────────────────────────────────────

  describe('generateAgents', () => {
    it('should generate Claude Code agents with memory dirs', async () => {
      const result = await generateAgents(testDir, 'web-app', { claudeCode: true });
      expect(result.claudeCode.length).toBeGreaterThan(0);

      // Check agent file exists
      const agentFile = join(testDir, '.claude', 'agents', 'frontend-engineer.md');
      expect(existsSync(agentFile)).toBe(true);

      const content = readFileSync(agentFile, 'utf-8');
      expect(content).toContain('name: frontend-engineer');
      expect(content).toContain('model: sonnet');
      expect(content).toContain('No Shortcuts');
      expect(content).toContain('Agent Memory');

      // Check memory directory created
      const memDir = join(testDir, '.claude', 'agent-memory', 'frontend-engineer');
      expect(existsSync(memDir)).toBe(true);
      expect(existsSync(join(memDir, 'MEMORY.md'))).toBe(true);
    });

    it('should generate Cursor contextual rules', async () => {
      const result = await generateAgents(testDir, 'web-app', { cursor: true });
      expect(result.cursor.length).toBeGreaterThan(0);

      // Check .mdc file exists with correct frontmatter
      const mdcFile = join(testDir, '.cursor', 'rules', 'agent-frontend-engineer.mdc');
      expect(existsSync(mdcFile)).toBe(true);

      const content = readFileSync(mdcFile, 'utf-8');
      expect(content).toContain('globs:');
      expect(content).toContain('*.tsx');
      expect(content).toContain('No stubs');
    });

    it('should generate inline sections for Gemini', async () => {
      const result = await generateAgents(testDir, 'web-app', { gemini: true });
      expect(result.inline.length).toBeGreaterThan(0);

      const joined = result.inline.join('\n');
      expect(joined).toContain('When Editing');
      expect(joined).toContain('frontend');
    });

    it('should generate for multiple tools simultaneously', async () => {
      const result = await generateAgents(testDir, 'web-app', {
        claudeCode: true,
        cursor: true,
        gemini: true,
      });
      expect(result.claudeCode.length).toBeGreaterThan(0);
      expect(result.cursor.length).toBeGreaterThan(0);
      expect(result.inline.length).toBeGreaterThan(0);
    });

    it('should include mandatory rules in Claude Code agents', async () => {
      await generateAgents(testDir, 'generic', { claudeCode: true });
      const agentFile = join(testDir, '.claude', 'agents', 'test-engineer.md');
      const content = readFileSync(agentFile, 'utf-8');
      expect(content).toContain('No Shortcuts');
      expect(content).toContain('Update tasks.md');
      expect(content).toContain('Never Mark Tasks as Deferred');
      expect(content).toContain('Research Before Implementing');
    });

    it('should include pre-flight checklist in Claude Code agents', async () => {
      await generateAgents(testDir, 'game-engine', { claudeCode: true });
      const agentFile = join(testDir, '.claude', 'agents', 'shader-engineer.md');
      const content = readFileSync(agentFile, 'utf-8');
      expect(content).toContain('Pre-Flight Checklist');
      expect(content).toContain('reference source');
    });

    it('should skip research-only agents in Cursor (no meaningful globs)', async () => {
      const result = await generateAgents(testDir, 'generic', { cursor: true });
      // researcher has domain=research and filePatterns=["*"] — should be skipped
      const researcherMdc = join(testDir, '.cursor', 'rules', 'agent-researcher.mdc');
      expect(existsSync(researcherMdc)).toBe(false);
    });
  });

  // ── listProjectTypes ────────────────────────────────────────────

  describe('listProjectTypes', () => {
    it('should list all project types with agent counts', async () => {
      const types = await listProjectTypes();
      expect(types.length).toBe(5);

      const generic = types.find((t) => t.type === 'generic');
      expect(generic).toBeDefined();
      expect(generic!.agentCount).toBeGreaterThan(0);

      const webApp = types.find((t) => t.type === 'web-app');
      expect(webApp).toBeDefined();
      // web-app should have more agents than generic (generic + web-app specific)
      expect(webApp!.agentCount).toBeGreaterThan(generic!.agentCount);
    });
  });
});
