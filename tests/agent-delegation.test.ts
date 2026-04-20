import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { mkdtemp, rm, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import {
  generateDelegationSection,
  resolveAgentPlaceholders,
  substituteAgentPlaceholders,
} from '../src/core/generator.js';
import type { ProjectConfig } from '../src/types.js';

const AGENTS_DIR = join(__dirname, '..', 'templates', 'agents');
const SKILLS_DIR = join(__dirname, '..', 'templates', 'skills', 'dev');

const ALL_AGENTS = [
  'accessibility-reviewer',
  'api-designer',
  'architect',
  'build-engineer',
  'code-reviewer',
  'context-intelligence',
  'database-architect',
  'devops-engineer',
  'docs-writer',
  'i18n-engineer',
  'implementer',
  'migration-engineer',
  'performance-engineer',
  'refactoring-agent',
  'researcher',
  'security-reviewer',
  'team-lead',
  'tester',
  'ux-reviewer',
];

const ALL_SKILLS = [
  'accessibility',
  'analysis',
  'api-design',
  'architect',
  'build-fix',
  'db-design',
  'debug',
  'deploy',
  'docs',
  'handoff',
  'migrate',
  'perf',
  'refactor',
  'research',
  'review',
  'security-audit',
];

const baseConfig: ProjectConfig = {
  languages: ['typescript'],
  modules: [],
  frameworks: ['express'],
  ides: [],
  projectType: 'application',
  coverageThreshold: 75,
  strictDocs: true,
  generateWorkflows: false,
};

describe('Agent Templates', () => {
  const agentFiles = readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'));

  it('has all 19 expected agent files', () => {
    const names = agentFiles.map((f) => f.replace('.md', '')).sort();
    expect(names).toEqual(ALL_AGENTS);
  });

  for (const file of agentFiles) {
    describe(file, () => {
      const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');

      it('has valid frontmatter with name, model, tools, and maxTurns', () => {
        expect(content).toMatch(/^---\r?\n/);
        expect(content).toMatch(/\r?\nname: .+/);
        expect(content).toMatch(/\r?\nmodel: (opus|sonnet|haiku)/);
        expect(content).toMatch(/\r?\ntools: .+/);
        expect(content).toMatch(/\r?\nmaxTurns: \d+/);
      });

      it('has a valid model value', () => {
        const modelMatch = content.match(/\nmodel: (opus|sonnet|haiku)/);
        expect(modelMatch).not.toBeNull();
        expect(['opus', 'sonnet', 'haiku']).toContain(modelMatch![1]);
      });

      it('has a description field', () => {
        expect(content).toMatch(/\r?\ndescription: .+/);
      });
    });
  }

  it('assigns correct models to agents', () => {
    const modelMap: Record<string, string> = {};
    for (const file of agentFiles) {
      const content = readFileSync(join(AGENTS_DIR, file), 'utf-8');
      const name = file.replace('.md', '');
      const match = content.match(/\nmodel: (\w+)/);
      if (match) modelMap[name] = match[1];
    }

    // opus — only for orchestration and architecture
    expect(modelMap['team-lead']).toBe('opus');
    expect(modelMap['architect']).toBe('opus');

    // sonnet — code-writing and deep analysis
    expect(modelMap['implementer']).toBe('sonnet');
    expect(modelMap['tester']).toBe('sonnet');
    expect(modelMap['code-reviewer']).toBe('sonnet');
    expect(modelMap['build-engineer']).toBe('sonnet');
    expect(modelMap['api-designer']).toBe('sonnet');
    expect(modelMap['database-architect']).toBe('sonnet');
    expect(modelMap['devops-engineer']).toBe('sonnet');
    expect(modelMap['performance-engineer']).toBe('sonnet');
    expect(modelMap['refactoring-agent']).toBe('sonnet');
    expect(modelMap['migration-engineer']).toBe('sonnet');

    // haiku — read-only, audit, review
    expect(modelMap['researcher']).toBe('haiku');
    expect(modelMap['docs-writer']).toBe('haiku');
    expect(modelMap['security-reviewer']).toBe('haiku');
    expect(modelMap['accessibility-reviewer']).toBe('haiku');
    expect(modelMap['i18n-engineer']).toBe('haiku');
    expect(modelMap['ux-reviewer']).toBe('haiku');
  });

  it('read-only agents have disallowedTools', () => {
    const readOnlyAgents = ['researcher', 'security-reviewer', 'code-reviewer'];
    for (const name of readOnlyAgents) {
      const content = readFileSync(join(AGENTS_DIR, `${name}.md`), 'utf-8');
      expect(content).toMatch(/disallowedTools:/);
    }
  });
});

describe('Dev Skills', () => {
  it('has all 16 expected skill directories', () => {
    const dirs = readdirSync(SKILLS_DIR).sort();
    expect(dirs).toEqual(ALL_SKILLS);
  });

  for (const skill of ALL_SKILLS) {
    describe(skill, () => {
      const skillPath = join(SKILLS_DIR, skill, 'SKILL.md');

      it('has a SKILL.md file', () => {
        expect(existsSync(skillPath)).toBe(true);
      });

      it('has valid frontmatter with name, model, context, and agent', () => {
        const content = readFileSync(skillPath, 'utf-8');
        expect(content).toMatch(/^---\r?\n/);
        expect(content).toMatch(/\r?\nname: .+/);
        expect(content).toMatch(/\r?\nmodel: (opus|sonnet|haiku)/);
        expect(content).toMatch(/\r?\ncontext: fork/);
        expect(content).toMatch(/\r?\nagent: .+/);
      });

      it('references an existing agent', () => {
        const content = readFileSync(skillPath, 'utf-8');
        const agentMatch = content.match(/\nagent: (.+)/);
        expect(agentMatch).not.toBeNull();
        const agentName = agentMatch![1].trim();
        expect(existsSync(join(AGENTS_DIR, `${agentName}.md`))).toBe(true);
      });
    });
  }
});

describe('generateDelegationSection', () => {
  it('generates a markdown table with all 18 agents', () => {
    const section = generateDelegationSection(baseConfig);
    expect(section).toContain('## Agent Delegation');
    expect(section).toContain('| Task | Agent | Model | When to use |');
    expect(section).toContain('| Implementation | implementer | sonnet |');
    expect(section).toContain('| Research | researcher | haiku |');
    expect(section).toContain('| Testing | tester | sonnet |');
    expect(section).toContain('| Documentation | docs-writer | haiku |');
    expect(section).toContain('| Build/CI | build-engineer | sonnet |');
    expect(section).toContain('| Security | security-reviewer | haiku |');
    expect(section).toContain('| Code Review | code-reviewer | sonnet |');
    expect(section).toContain('| Architecture | architect | opus |');
    expect(section).toContain('| API Design | api-designer | sonnet |');
    expect(section).toContain('| Database | database-architect | sonnet |');
    expect(section).toContain('| DevOps | devops-engineer | sonnet |');
    expect(section).toContain('| Performance | performance-engineer | sonnet |');
    expect(section).toContain('| Refactoring | refactoring-agent | sonnet |');
    expect(section).toContain('| Migration | migration-engineer | sonnet |');
    expect(section).toContain('| Accessibility | accessibility-reviewer | haiku |');
    expect(section).toContain('| i18n | i18n-engineer | haiku |');
    expect(section).toContain('| UX Review | ux-reviewer | haiku |');
    expect(section).toContain('| Orchestration | team-lead | opus |');
  });

  it('includes primary language in context line', () => {
    const section = generateDelegationSection(baseConfig);
    expect(section).toContain('Primary language is **typescript**');
  });

  it('includes framework in context line when present', () => {
    const section = generateDelegationSection(baseConfig);
    expect(section).toContain('with **express**');
  });

  it('omits framework when not present', () => {
    const config = { ...baseConfig, frameworks: [] };
    const section = generateDelegationSection(config);
    expect(section).not.toContain('with **');
  });

  it('includes delegation rules', () => {
    const section = generateDelegationSection(baseConfig);
    expect(section).toContain('Never write code directly in the main conversation');
    expect(section).toContain('launch tester + docs-writer in parallel');
    expect(section).toContain('Use haiku agents');
  });

  it('falls back to generic language when none detected', () => {
    const config = { ...baseConfig, languages: [] };
    const section = generateDelegationSection(config);
    expect(section).toContain('Primary language is **the project language**');
  });
});

describe('resolveAgentPlaceholders', () => {
  it('resolves TypeScript placeholders correctly', () => {
    const placeholders = resolveAgentPlaceholders(baseConfig);
    expect(placeholders['{{language}}']).toBe('typescript');
    expect(placeholders['{{framework}}']).toBe('express');
    expect(placeholders['{{test_framework}}']).toBe('vitest');
    expect(placeholders['{{file_naming}}']).toBe('kebab-case');
  });

  it('resolves Python placeholders correctly', () => {
    const config = { ...baseConfig, languages: ['python'], frameworks: ['django'] };
    const placeholders = resolveAgentPlaceholders(config);
    expect(placeholders['{{language}}']).toBe('python');
    expect(placeholders['{{framework}}']).toBe('django');
    expect(placeholders['{{test_framework}}']).toBe('pytest');
    expect(placeholders['{{file_naming}}']).toBe('snake_case');
  });

  it('resolves Rust placeholders correctly', () => {
    const config = { ...baseConfig, languages: ['rust'], frameworks: [] };
    const placeholders = resolveAgentPlaceholders(config);
    expect(placeholders['{{language}}']).toBe('rust');
    expect(placeholders['{{test_framework}}']).toBe('cargo test');
    expect(placeholders['{{file_naming}}']).toBe('snake_case');
  });

  it('resolves Go placeholders correctly', () => {
    const config = { ...baseConfig, languages: ['go'], frameworks: [] };
    const placeholders = resolveAgentPlaceholders(config);
    expect(placeholders['{{language}}']).toBe('go');
    expect(placeholders['{{test_framework}}']).toBe('go test');
    expect(placeholders['{{file_naming}}']).toBe('snake_case');
  });

  it('resolves Java placeholders correctly', () => {
    const config = { ...baseConfig, languages: ['java'], frameworks: ['spring'] };
    const placeholders = resolveAgentPlaceholders(config);
    expect(placeholders['{{language}}']).toBe('java');
    expect(placeholders['{{framework}}']).toBe('spring');
    expect(placeholders['{{test_framework}}']).toBe('JUnit');
    expect(placeholders['{{file_naming}}']).toBe('PascalCase');
  });

  it('falls back to defaults for unknown languages', () => {
    const config = { ...baseConfig, languages: ['brainfuck'], frameworks: [] };
    const placeholders = resolveAgentPlaceholders(config);
    expect(placeholders['{{language}}']).toBe('brainfuck');
    expect(placeholders['{{test_framework}}']).toBe('the project test framework');
    expect(placeholders['{{file_naming}}']).toBe('kebab-case');
  });

  it('falls back to TypeScript when no languages detected', () => {
    const config = { ...baseConfig, languages: [] };
    const placeholders = resolveAgentPlaceholders(config);
    expect(placeholders['{{language}}']).toBe('TypeScript');
  });
});

describe('substituteAgentPlaceholders', () => {
  it('replaces all placeholders in content', () => {
    const content = 'Write {{language}} code using {{test_framework}} with {{file_naming}} files';
    const placeholders = {
      '{{language}}': 'Rust',
      '{{test_framework}}': 'cargo test',
      '{{file_naming}}': 'snake_case',
    };
    const result = substituteAgentPlaceholders(content, placeholders);
    expect(result).toBe('Write Rust code using cargo test with snake_case files');
  });

  it('replaces multiple occurrences of the same placeholder', () => {
    const content = '{{language}} is great. I love {{language}}.';
    const placeholders = { '{{language}}': 'Rust' };
    const result = substituteAgentPlaceholders(content, placeholders);
    expect(result).toBe('Rust is great. I love Rust.');
  });

  it('returns content unchanged when no placeholders match', () => {
    const content = 'No placeholders here';
    const result = substituteAgentPlaceholders(content, { '{{language}}': 'Rust' });
    expect(result).toBe('No placeholders here');
  });
});

describe('installAgentsWithPlaceholders (integration)', () => {
  it('generates agents in .claude/agents/ via generateModularAgents', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'agent-delegation-test-'));
    try {
      await mkdir(join(tmpDir, '.rulebook'), { recursive: true });

      const { generateModularAgents } = await import('../src/core/generator.js');
      await generateModularAgents(baseConfig, tmpDir);

      const agentsDir = join(tmpDir, '.claude', 'agents');
      const files = readdirSync(agentsDir);
      expect(files).toContain('implementer.md');
      expect(files).toContain('docs-writer.md');
      expect(files).toContain('security-reviewer.md');
      expect(files).toContain('architect.md');
      expect(files).toContain('devops-engineer.md');
      expect(files.length).toBe(19);

      // Verify placeholders were substituted
      const implementer = readFileSync(join(agentsDir, 'implementer.md'), 'utf-8');
      expect(implementer).toContain('typescript');
      expect(implementer).not.toContain('{{language}}');

      const tester = readFileSync(join(agentsDir, 'tester.md'), 'utf-8');
      expect(tester).toContain('vitest');
      expect(tester).not.toContain('{{test_framework}}');
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('installs dev skills to .claude/skills/ via generateModularAgents', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'agent-skills-test-'));
    try {
      await mkdir(join(tmpDir, '.rulebook'), { recursive: true });

      const { generateModularAgents } = await import('../src/core/generator.js');
      await generateModularAgents(baseConfig, tmpDir);

      const skillsDir = join(tmpDir, '.claude', 'skills');
      expect(existsSync(skillsDir)).toBe(true);

      // Check core + dev skills were installed. v5.4.0 added the three
      // invocable `rulebook-terse*` core skills alongside the dev set.
      const skillDirs = readdirSync(skillsDir);
      expect(skillDirs).toContain('docs');
      expect(skillDirs).toContain('review');
      expect(skillDirs).toContain('debug');
      expect(skillDirs).toContain('architect');
      expect(skillDirs).toContain('security-audit');
      expect(skillDirs).toContain('rulebook-terse');
      expect(skillDirs).toContain('rulebook-terse-commit');
      expect(skillDirs).toContain('rulebook-terse-review');
      expect(skillDirs.length).toBe(19);

      // Verify SKILL.md exists in each skill dir
      for (const dir of skillDirs) {
        const skillMd = join(skillsDir, dir, 'SKILL.md');
        expect(existsSync(skillMd)).toBe(true);
      }

      // Verify skill content has correct frontmatter
      const docsSkill = readFileSync(join(skillsDir, 'docs', 'SKILL.md'), 'utf-8');
      expect(docsSkill).toContain('context: fork');
      expect(docsSkill).toContain('agent: docs-writer');
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
