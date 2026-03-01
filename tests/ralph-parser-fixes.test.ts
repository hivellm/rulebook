import { describe, it, expect } from 'vitest';
import { RalphParser } from '../src/agents/ralph-parser.js';

describe('RalphParser — false negative fixes', () => {
  describe('parseCoveragePercentage', () => {
    it('parses vitest All files table row', () => {
      const output = `
 % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
All files |   87.50 |   75.00 |   80.00 |   87.50 |
      `;
      expect(RalphParser.parseCoveragePercentage(output)).toBe(87.5);
    });

    it('parses jest Lines pattern', () => {
      const output = 'Lines                : 92.5% ( 74/80 )';
      expect(RalphParser.parseCoveragePercentage(output)).toBe(92.5);
    });

    it('parses generic coverage: XX%', () => {
      const output = 'coverage: 78%';
      expect(RalphParser.parseCoveragePercentage(output)).toBe(78);
    });

    it('returns null for unparseable output', () => {
      expect(RalphParser.parseCoveragePercentage('no coverage info here')).toBeNull();
    });

    it('returns null for empty output', () => {
      expect(RalphParser.parseCoveragePercentage('')).toBeNull();
    });
  });

  describe('extractQualityChecks — false negative fixes', () => {
    it('"0 errors found" on lint line → lint passes (not fails)', () => {
      const output = 'eslint: 0 errors found, 0 warnings';
      const result = RalphParser.parseAgentOutput(output, 1, 't1', 'T', 'claude');
      expect(result.quality_checks.lint).toBe(true);
    });

    it('"No lint errors" → lint passes', () => {
      const output = 'lint check complete — No lint errors detected';
      const result = RalphParser.parseAgentOutput(output, 1, 't1', 'T', 'claude');
      expect(result.quality_checks.lint).toBe(true);
    });

    it('"0 failed" in test output → tests pass', () => {
      const output = 'vitest: 10 passed | 0 failed';
      const result = RalphParser.parseAgentOutput(output, 1, 't1', 'T', 'claude');
      expect(result.quality_checks.tests).toBe(true);
    });

    it('"0 errors" on test line → tests pass', () => {
      const output = 'test suite: 0 errors, 0 failures — all tests pass';
      const result = RalphParser.parseAgentOutput(output, 1, 't1', 'T', 'claude');
      expect(result.quality_checks.tests).toBe(true);
    });

    it('"error TS2345" → type_check fails', () => {
      const output = 'error TS2345: Argument of type is not assignable';
      const result = RalphParser.parseAgentOutput(output, 1, 't1', 'T', 'claude');
      expect(result.quality_checks.type_check).toBe(false);
    });

    it('"2 problems (1 error, 1 warning)" → lint fails', () => {
      const output = 'eslint: 2 problems (1 error, 1 warning)';
      const result = RalphParser.parseAgentOutput(output, 1, 't1', 'T', 'claude');
      expect(result.quality_checks.lint).toBe(false);
    });

    it('"3 failed" in test output → tests fail', () => {
      const output = 'vitest: 3 failed | 7 passed';
      const result = RalphParser.parseAgentOutput(output, 1, 't1', 'T', 'claude');
      expect(result.quality_checks.tests).toBe(false);
    });

    it('coverage 96% → coverage_met passes', () => {
      const output = 'All files |   96.00 |   90.00 |   85.00 |   96.00 |';
      const result = RalphParser.parseAgentOutput(output, 1, 't1', 'T', 'claude');
      expect(result.quality_checks.coverage_met).toBe(true);
    });

    it('coverage 60% → coverage_met fails', () => {
      const output = 'All files |   60.00 |   55.00 |   50.00 |   60.00 |';
      const result = RalphParser.parseAgentOutput(output, 1, 't1', 'T', 'claude');
      expect(result.quality_checks.coverage_met).toBe(false);
    });
  });

  describe('status determination', () => {
    it('all gates pass → status: success', () => {
      const output = `
        tsc passed without errors
        eslint: 0 problems (0 errors, 0 warnings)
        vitest: 15 passed | 0 failed
        All files |   97.00 |   92.00 |   88.00 |   97.00 |
      `;
      const result = RalphParser.parseAgentOutput(output, 1, 't1', 'T', 'claude');
      expect(result.status).toBe('success');
    });
  });
});
