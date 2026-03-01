import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import {
  detectGeminiCli,
  detectContinueDev,
  detectWindsurf,
  detectGithubCopilot,
} from '../src/core/detector.js';
import { generateMultiToolConfigs } from '../src/core/multi-tool-generator.js';
import type { DetectionResult } from '../src/types.js';

/**
 * Build a minimal DetectionResult with all tool flags set to the given overrides.
 */
function buildDetection(overrides: Partial<DetectionResult> = {}): DetectionResult {
  return {
    languages: [],
    modules: [],
    frameworks: [],
    services: [],
    existingAgents: null,
    geminiCli: { detected: false },
    continueDev: { detected: false, rulesDir: '' },
    windsurf: { detected: false },
    githubCopilot: { detected: false },
    ...overrides,
  };
}

describe('Multi-Tool Detection', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), `.test-multi-tool-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ─── Detection Tests ─────────────────────────────────────────────────

  it('detectGeminiCli: detected when GEMINI.md exists', async () => {
    await writeFile(join(tempDir, 'GEMINI.md'), '# Gemini\n', 'utf-8');
    const result = await detectGeminiCli(tempDir);
    expect(result.detected).toBe(true);
  });

  it('detectGeminiCli: not detected when GEMINI.md is absent', async () => {
    const result = await detectGeminiCli(tempDir);
    expect(result.detected).toBe(false);
  });

  it('detectContinueDev: detected when .continue/ directory exists', async () => {
    await mkdir(join(tempDir, '.continue'), { recursive: true });
    const result = await detectContinueDev(tempDir);
    expect(result.detected).toBe(true);
    expect(result.rulesDir).toBe(join(tempDir, '.continue', 'rules'));
  });

  it('detectContinueDev: not detected when .continue/ is absent', async () => {
    const result = await detectContinueDev(tempDir);
    expect(result.detected).toBe(false);
  });

  it('detectWindsurf: detected when .windsurfrules exists', async () => {
    await writeFile(join(tempDir, '.windsurfrules'), '', 'utf-8');
    const result = await detectWindsurf(tempDir);
    expect(result.detected).toBe(true);
  });

  it('detectWindsurf: not detected when .windsurfrules is absent', async () => {
    const result = await detectWindsurf(tempDir);
    expect(result.detected).toBe(false);
  });

  it('detectGithubCopilot: detected when .github/copilot-instructions.md exists', async () => {
    await mkdir(join(tempDir, '.github'), { recursive: true });
    await writeFile(join(tempDir, '.github', 'copilot-instructions.md'), '', 'utf-8');
    const result = await detectGithubCopilot(tempDir);
    expect(result.detected).toBe(true);
  });

  it('detectGithubCopilot: not detected when file is absent', async () => {
    const result = await detectGithubCopilot(tempDir);
    expect(result.detected).toBe(false);
  });

  it('all tools return not detected in an empty directory', async () => {
    const [gemini, cont, wind, copilot] = await Promise.all([
      detectGeminiCli(tempDir),
      detectContinueDev(tempDir),
      detectWindsurf(tempDir),
      detectGithubCopilot(tempDir),
    ]);
    expect(gemini.detected).toBe(false);
    expect(cont.detected).toBe(false);
    expect(wind.detected).toBe(false);
    expect(copilot.detected).toBe(false);
  });

  // ─── Generator Tests ─────────────────────────────────────────────────

  it('generateMultiToolConfigs: generates only detected tool configs', async () => {
    // Mark only geminiCli as detected
    const detection = buildDetection({
      geminiCli: { detected: true },
    });

    const result = await generateMultiToolConfigs(tempDir, detection);

    // GEMINI.md should be created
    expect(result.geminiMd).toBeDefined();
    expect(existsSync(join(tempDir, 'GEMINI.md'))).toBe(true);

    // Others should not be created
    expect(result.continueRules).toBeUndefined();
    expect(result.windsurfRules).toBeUndefined();
    expect(result.copilotInstructions).toBeUndefined();
    expect(existsSync(join(tempDir, '.windsurfrules'))).toBe(false);
    expect(existsSync(join(tempDir, '.github', 'copilot-instructions.md'))).toBe(false);
  });

  it('generateMultiToolConfigs: generates all configs when all tools detected', async () => {
    const detection = buildDetection({
      geminiCli: { detected: true },
      continueDev: { detected: true, rulesDir: join(tempDir, '.continue', 'rules') },
      windsurf: { detected: true },
      githubCopilot: { detected: true },
    });

    const result = await generateMultiToolConfigs(tempDir, detection);

    expect(result.geminiMd).toBeDefined();
    expect(result.continueRules).toBeDefined();
    expect(result.windsurfRules).toBeDefined();
    expect(result.copilotInstructions).toBeDefined();

    // Verify files exist on disk
    expect(existsSync(join(tempDir, 'GEMINI.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.continue', 'rules', 'RULEBOOK.md'))).toBe(true);
    expect(existsSync(join(tempDir, '.windsurfrules'))).toBe(true);
    expect(existsSync(join(tempDir, '.github', 'copilot-instructions.md'))).toBe(true);
  });

  it('generateMultiToolConfigs: generated files contain RULEBOOK marker', async () => {
    const detection = buildDetection({
      geminiCli: { detected: true },
      windsurf: { detected: true },
      githubCopilot: { detected: true },
    });

    await generateMultiToolConfigs(tempDir, detection);

    const geminiContent = readFileSync(join(tempDir, 'GEMINI.md'), 'utf-8');
    const windsurfContent = readFileSync(join(tempDir, '.windsurfrules'), 'utf-8');
    const copilotContent = readFileSync(
      join(tempDir, '.github', 'copilot-instructions.md'),
      'utf-8'
    );

    expect(geminiContent).toContain('<!-- RULEBOOK:START -->');
    expect(windsurfContent).toContain('<!-- RULEBOOK:START -->');
    expect(copilotContent).toContain('<!-- RULEBOOK:START -->');
  });

  it('generateMultiToolConfigs: skips user-owned files without RULEBOOK marker', async () => {
    // Create a user-owned GEMINI.md without the marker
    const userContent = '# My Custom Gemini Config\n';
    await writeFile(join(tempDir, 'GEMINI.md'), userContent, 'utf-8');

    const detection = buildDetection({
      geminiCli: { detected: true },
    });

    const result = await generateMultiToolConfigs(tempDir, detection);

    // Should be skipped (undefined) since user file doesn't have the marker
    expect(result.geminiMd).toBeUndefined();

    // Original content should be preserved
    const afterContent = readFileSync(join(tempDir, 'GEMINI.md'), 'utf-8');
    expect(afterContent).toBe(userContent);
  });

  it('generateMultiToolConfigs: updates files that already have RULEBOOK marker', async () => {
    // Create a file with the marker
    const oldContent = '<!-- RULEBOOK:START -->\nOld content\n<!-- RULEBOOK:END -->\n';
    await writeFile(join(tempDir, 'GEMINI.md'), oldContent, 'utf-8');

    const detection = buildDetection({
      geminiCli: { detected: true },
    });

    const result = await generateMultiToolConfigs(tempDir, detection);

    // Should be updated (not skipped)
    expect(result.geminiMd).toBeDefined();

    // Content should have been replaced with the template
    const afterContent = readFileSync(join(tempDir, 'GEMINI.md'), 'utf-8');
    expect(afterContent).not.toBe(oldContent);
    expect(afterContent).toContain('<!-- RULEBOOK:START -->');
    expect(afterContent).toContain('Gemini CLI');
  });

  it('generateMultiToolConfigs: returns empty result when no tools detected', async () => {
    const detection = buildDetection();

    const result = await generateMultiToolConfigs(tempDir, detection);

    expect(result.geminiMd).toBeUndefined();
    expect(result.continueRules).toBeUndefined();
    expect(result.windsurfRules).toBeUndefined();
    expect(result.copilotInstructions).toBeUndefined();
  });
});
