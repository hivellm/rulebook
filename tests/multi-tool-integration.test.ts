import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { projectRules, installRule, loadCanonicalRules } from '../src/core/rule-engine.js';
import { generateAgents, loadAgentTemplates } from '../src/core/agent-template-engine.js';
import { assessComplexity } from '../src/core/complexity-detector.js';

/**
 * Integration tests for the multi-tool v5 flow:
 * assess complexity → install rules → project to tools → generate agents
 */
describe('Multi-Tool Integration', () => {
  let testDir: string;
  let templatesDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `rulebook-integration-test-${Date.now()}`);
    mkdirSync(join(testDir, '.rulebook', 'rules'), { recursive: true });
    mkdirSync(join(testDir, 'src'), { recursive: true });

    // Create some source files for complexity detection
    for (let i = 0; i < 20; i++) {
      writeFileSync(join(testDir, 'src', `module${i}.ts`), `export const x${i} = ${i};\n`.repeat(100));
    }
    writeFileSync(join(testDir, 'src', 'main.py'), 'x = 1\n'.repeat(100));

    // Templates dir (use actual project templates)
    templatesDir = join(__dirname, '..', 'templates');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('End-to-end: assess → install → project → agents', () => {
    it('should assess project complexity', () => {
      const result = assessComplexity(testDir);
      expect(result.tier).toBeDefined();
      expect(['small', 'medium', 'large', 'complex']).toContain(result.tier);
      expect(result.metrics.estimatedLoc).toBeGreaterThan(0);
      expect(result.metrics.languageCount).toBeGreaterThanOrEqual(1);
      expect(result.recommendations.tier1Rules).toBe(true);
    });

    it('should install Tier 1 rules from template library', async () => {
      const tier1Rules = ['no-shortcuts', 'git-safety', 'sequential-editing', 'research-first', 'follow-task-sequence'];

      for (const name of tier1Rules) {
        const result = await installRule(testDir, name, templatesDir);
        expect(result).not.toBeNull();
      }

      const rules = await loadCanonicalRules(testDir);
      expect(rules.length).toBe(tier1Rules.length);

      const tier1 = rules.filter(r => r.tier === 1);
      expect(tier1.length).toBe(tier1Rules.length);
    });

    it('should install Tier 2 rules for medium+ complexity', async () => {
      const allRules = [
        'no-shortcuts', 'git-safety', 'sequential-editing', 'research-first', 'follow-task-sequence',
        'task-decomposition', 'incremental-tests', 'no-deferred', 'session-workflow',
      ];

      for (const name of allRules) {
        await installRule(testDir, name, templatesDir);
      }

      const rules = await loadCanonicalRules(testDir);
      expect(rules.length).toBe(allRules.length);

      const tier2 = rules.filter(r => r.tier === 2);
      expect(tier2.length).toBeGreaterThan(0);
    });

    it('should project installed rules to Claude Code format', async () => {
      await installRule(testDir, 'no-shortcuts', templatesDir);
      await installRule(testDir, 'git-safety', templatesDir);

      const result = await projectRules(testDir, { claudeCode: true });
      expect(result.claudeCode).toHaveLength(2);
      expect(existsSync(join(testDir, '.claude', 'rules', 'no-shortcuts.md'))).toBe(true);
      expect(existsSync(join(testDir, '.claude', 'rules', 'git-safety.md'))).toBe(true);
    });

    it('should project installed rules to Cursor format', async () => {
      await installRule(testDir, 'no-shortcuts', templatesDir);

      const result = await projectRules(testDir, { cursor: true });
      expect(result.cursor).toHaveLength(1);

      const mdcPath = join(testDir, '.cursor', 'rules', 'no-shortcuts.mdc');
      expect(existsSync(mdcPath)).toBe(true);

      const content = readFileSync(mdcPath, 'utf-8');
      expect(content).toContain('alwaysApply: true');
      expect(content).toContain('NEVER simplify');
    });

    it('should project to ALL detected tools simultaneously', async () => {
      await installRule(testDir, 'no-shortcuts', templatesDir);
      await installRule(testDir, 'git-safety', templatesDir);

      const result = await projectRules(testDir, {
        claudeCode: true,
        cursor: true,
        gemini: true,
        copilot: true,
        windsurf: true,
        continueDev: true,
      });

      expect(result.claudeCode.length).toBe(2);
      expect(result.cursor.length).toBe(2);
      expect(result.gemini.length).toBe(1); // Single GEMINI.md file
      expect(result.copilot.length).toBe(1); // Single copilot-instructions.md
      expect(result.windsurf.length).toBe(2);
      expect(result.continueDev.length).toBe(2);

      // Verify Gemini contains all rules (uses descriptions, not names)
      const geminiContent = readFileSync(join(testDir, 'GEMINI.md'), 'utf-8');
      expect(geminiContent).toContain('stubs');
      expect(geminiContent).toContain('Git safety');
      expect(geminiContent).toContain('Highest Precedence');
    });

    it('should generate agents for web-app project to Claude Code', async () => {
      const result = await generateAgents(testDir, 'web-app', { claudeCode: true });
      expect(result.claudeCode.length).toBeGreaterThan(5); // generic + web-app agents

      // Verify agent files exist
      expect(existsSync(join(testDir, '.claude', 'agents', 'frontend-engineer.md'))).toBe(true);
      expect(existsSync(join(testDir, '.claude', 'agents', 'researcher.md'))).toBe(true);

      // Verify memory dirs created
      expect(existsSync(join(testDir, '.claude', 'agent-memory', 'frontend-engineer', 'MEMORY.md'))).toBe(true);
    });

    it('should degrade agents to Cursor contextual rules', async () => {
      const result = await generateAgents(testDir, 'web-app', { cursor: true });
      expect(result.cursor.length).toBeGreaterThan(0);

      // Verify .mdc file with globs
      const mdcFile = join(testDir, '.cursor', 'rules', 'agent-frontend-engineer.mdc');
      expect(existsSync(mdcFile)).toBe(true);

      const content = readFileSync(mdcFile, 'utf-8');
      expect(content).toContain('globs:');
      expect(content).toContain('.tsx');
    });

    it('should work end-to-end: complexity → rules → projection → agents', async () => {
      // 1. Assess
      const complexity = assessComplexity(testDir);

      // 2. Install rules based on tier
      const tier1 = ['no-shortcuts', 'git-safety', 'follow-task-sequence'];
      for (const name of tier1) {
        await installRule(testDir, name, templatesDir);
      }
      if (complexity.recommendations.tier2Rules) {
        await installRule(testDir, 'task-decomposition', templatesDir);
      }

      // 3. Project rules
      const ruleResult = await projectRules(testDir, { claudeCode: true, cursor: true });
      expect(ruleResult.claudeCode.length).toBeGreaterThanOrEqual(3);
      expect(ruleResult.cursor.length).toBeGreaterThanOrEqual(3);

      // 4. Generate agents
      const agentResult = await generateAgents(testDir, 'web-app', { claudeCode: true, cursor: true });
      expect(agentResult.claudeCode.length).toBeGreaterThan(0);
      expect(agentResult.cursor.length).toBeGreaterThan(0);

      // 5. Verify everything exists
      expect(existsSync(join(testDir, '.claude', 'rules'))).toBe(true);
      expect(existsSync(join(testDir, '.claude', 'agents'))).toBe(true);
      expect(existsSync(join(testDir, '.cursor', 'rules'))).toBe(true);
    });
  });

  describe('Tool targeting', () => {
    it('should only project to specified tools', async () => {
      await installRule(testDir, 'no-shortcuts', templatesDir);

      const result = await projectRules(testDir, { claudeCode: true });
      expect(result.claudeCode.length).toBe(1);
      expect(result.cursor).toEqual([]);
      expect(result.gemini).toEqual([]);

      expect(existsSync(join(testDir, '.claude', 'rules', 'no-shortcuts.md'))).toBe(true);
      expect(existsSync(join(testDir, '.cursor', 'rules', 'no-shortcuts.mdc'))).toBe(false);
    });

    it('should respect rule tool targeting', async () => {
      // Create a rule that only targets cursor
      writeFileSync(
        join(testDir, '.rulebook', 'rules', 'cursor-only.md'),
        '---\nname: cursor-only\ntier: 2\ndescription: "Cursor specific"\nalwaysApply: true\ntools: ["cursor"]\n---\nCursor rule content'
      );

      const result = await projectRules(testDir, { claudeCode: true, cursor: true });
      // cursor-only should only be in cursor, not claude
      expect(result.cursor.length).toBe(1);
      expect(result.claudeCode.length).toBe(0);
    });
  });
});
