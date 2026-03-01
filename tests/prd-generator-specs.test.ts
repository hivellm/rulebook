import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PRDGenerator } from '../src/core/prd-generator.js';
import { Logger } from '../src/core/logger.js';
import { existsSync, rmSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

describe('PRDGenerator — specs/*.md context reading', () => {
  let tempDir: string;
  let logger: Logger;
  let generator: PRDGenerator;

  beforeEach(async () => {
    tempDir = join(process.cwd(), `.test-prd-specs-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    generator = new PRDGenerator(tempDir, logger);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('extracts SHALL statements from specs/ as acceptance criteria', async () => {
    const taskDir = join(tempDir, '.rulebook', 'tasks', 'my-task');
    const specsDir = join(taskDir, 'specs', 'core');
    await mkdir(specsDir, { recursive: true });

    await writeFile(join(taskDir, 'proposal.md'), '# My Task\n\nDo something.');
    await writeFile(join(taskDir, 'tasks.md'), '- [ ] Do the thing');
    await writeFile(
      join(specsDir, 'spec.md'),
      `# Spec
- SHALL validate input before processing
- MUST NOT expose credentials in logs
- SHALL return structured error objects
`
    );

    const prd = await generator.generatePRD('test');
    const story = prd.userStories[0];

    expect(story.acceptanceCriteria.some((c) => c.includes('SHALL validate input'))).toBe(true);
    expect(story.acceptanceCriteria.some((c) => c.includes('MUST NOT expose credentials'))).toBe(true);
    expect(story.acceptanceCriteria.some((c) => c.includes('SHALL return structured error'))).toBe(true);
  });

  it('includes spec file paths in story notes', async () => {
    const taskDir = join(tempDir, '.rulebook', 'tasks', 'spec-task');
    const specsDir = join(taskDir, 'specs', 'module');
    await mkdir(specsDir, { recursive: true });

    await writeFile(join(taskDir, 'proposal.md'), '# Spec Task\n\nTest specs.');
    await writeFile(join(specsDir, 'spec.md'), '# Module\nSHALL do things');

    const prd = await generator.generatePRD('test');
    const story = prd.userStories[0];

    expect(story.notes).toContain('specs/module/spec.md');
  });

  it('works without specs/ directory (no error)', async () => {
    const taskDir = join(tempDir, '.rulebook', 'tasks', 'no-specs');
    await mkdir(taskDir, { recursive: true });

    await writeFile(join(taskDir, 'proposal.md'), '# No Specs\n\nJust a proposal.');
    await writeFile(join(taskDir, 'tasks.md'), '- [ ] Do something');

    const prd = await generator.generatePRD('test');
    expect(prd.userStories).toHaveLength(1);
    expect(prd.userStories[0].notes).toBe('');
  });

  it('merges tasks.md checklist with spec SHALL/MUST criteria', async () => {
    const taskDir = join(tempDir, '.rulebook', 'tasks', 'merged');
    const specsDir = join(taskDir, 'specs', 'api');
    await mkdir(specsDir, { recursive: true });

    await writeFile(join(taskDir, 'proposal.md'), '# Merged\n\nTask.');
    await writeFile(join(taskDir, 'tasks.md'), '- [ ] Implement endpoint\n- [ ] Write tests');
    await writeFile(join(specsDir, 'spec.md'), '- SHALL return 200 on success\n- MUST validate auth token');

    const prd = await generator.generatePRD('test');
    const criteria = prd.userStories[0].acceptanceCriteria;

    // Has both checklist items AND spec requirements
    expect(criteria.some((c) => c === 'Implement endpoint')).toBe(true);
    expect(criteria.some((c) => c.includes('SHALL return 200'))).toBe(true);
    expect(criteria.some((c) => c.includes('MUST validate auth'))).toBe(true);
  });
});
