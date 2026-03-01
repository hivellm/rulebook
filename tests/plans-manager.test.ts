import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  readPlans,
  initPlans,
  clearPlans,
  updatePlansContext,
  updatePlansTask,
  appendPlansHistory,
  plansExists,
  getPlansPath,
} from '../src/core/plans-manager.js';

describe('PlansManager — PLANS.md session scratchpad', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(process.cwd(), `.test-plans-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('initPlans', () => {
    it('creates PLANS.md when it does not exist', async () => {
      const created = await initPlans(tempDir);
      expect(created).toBe(true);
      expect(existsSync(getPlansPath(tempDir))).toBe(true);
    });

    it('does not overwrite existing PLANS.md', async () => {
      const plansPath = getPlansPath(tempDir);
      await mkdir(join(tempDir, '.rulebook'), { recursive: true });
      await writeFile(plansPath, '# Custom Content\nMy custom plans.');

      const created = await initPlans(tempDir);
      expect(created).toBe(false);

      // Original content preserved
      const plans = await readPlans(tempDir);
      expect(plans?.raw).toContain('My custom plans.');
    });
  });

  describe('plansExists', () => {
    it('returns false when PLANS.md does not exist', () => {
      expect(plansExists(tempDir)).toBe(false);
    });

    it('returns true after initPlans', async () => {
      await initPlans(tempDir);
      expect(plansExists(tempDir)).toBe(true);
    });
  });

  describe('readPlans', () => {
    it('returns null when PLANS.md does not exist', async () => {
      const plans = await readPlans(tempDir);
      expect(plans).toBeNull();
    });

    it('reads initialized PLANS.md sections', async () => {
      await initPlans(tempDir);
      const plans = await readPlans(tempDir);
      expect(plans).not.toBeNull();
      expect(plans!.raw).toContain('PLANS:CONTEXT:START');
    });
  });

  describe('updatePlansContext', () => {
    it('updates the Active Context section', async () => {
      await initPlans(tempDir);
      await updatePlansContext(tempDir, 'Working on auth module. JWT tokens chosen.');

      const plans = await readPlans(tempDir);
      expect(plans!.context).toBe('Working on auth module. JWT tokens chosen.');
    });

    it('creates PLANS.md if it does not exist', async () => {
      await updatePlansContext(tempDir, 'Context without init');
      expect(existsSync(getPlansPath(tempDir))).toBe(true);
      const plans = await readPlans(tempDir);
      expect(plans!.context).toBe('Context without init');
    });
  });

  describe('updatePlansTask', () => {
    it('updates the Current Task section', async () => {
      await initPlans(tempDir);
      await updatePlansTask(tempDir, 'Implementing cursor-mdc-rules feature');

      const plans = await readPlans(tempDir);
      expect(plans!.currentTask).toBe('Implementing cursor-mdc-rules feature');
    });
  });

  describe('appendPlansHistory', () => {
    it('appends entry to history section', async () => {
      await initPlans(tempDir);
      await appendPlansHistory(tempDir, 'Completed auth module. All tests pass.');

      const plans = await readPlans(tempDir);
      expect(plans!.history).toContain('Completed auth module. All tests pass.');
    });

    it('appends multiple entries in chronological order', async () => {
      await initPlans(tempDir);
      await appendPlansHistory(tempDir, 'First session: started auth');
      await appendPlansHistory(tempDir, 'Second session: finished auth');

      const plans = await readPlans(tempDir);
      const histIdx1 = plans!.history.indexOf('First session');
      const histIdx2 = plans!.history.indexOf('Second session');
      expect(histIdx1).toBeLessThan(histIdx2);
    });
  });

  describe('clearPlans', () => {
    it('resets PLANS.md to empty template', async () => {
      await initPlans(tempDir);
      await updatePlansContext(tempDir, 'Some context');
      await appendPlansHistory(tempDir, 'Some history');

      await clearPlans(tempDir);

      const plans = await readPlans(tempDir);
      // After clear, context should be empty or the default placeholder
      expect(plans!.context).not.toBe('Some context');
      // History should be cleared
      expect(plans!.history).not.toContain('Some history');
    });
  });
});
