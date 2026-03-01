import { describe, it, expect } from 'vitest';
import { RalphParser } from '../src/agents/ralph-parser.js';

describe('RalphParser — Security Gate', () => {
  describe('parseNpmAuditSeverity', () => {
    it('returns "none" when no vulnerabilities', () => {
      const json = JSON.stringify({
        metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0 } },
      });
      expect(RalphParser.parseNpmAuditSeverity(json)).toBe('none');
    });

    it('returns "critical" when critical vulns present', () => {
      const json = JSON.stringify({
        metadata: { vulnerabilities: { critical: 1, high: 0, moderate: 0, low: 0 } },
      });
      expect(RalphParser.parseNpmAuditSeverity(json)).toBe('critical');
    });

    it('returns "high" when only high vulns present', () => {
      const json = JSON.stringify({
        metadata: { vulnerabilities: { critical: 0, high: 2, moderate: 0, low: 0 } },
      });
      expect(RalphParser.parseNpmAuditSeverity(json)).toBe('high');
    });

    it('returns "moderate" when only moderate vulns present', () => {
      const json = JSON.stringify({
        metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 3, low: 0 } },
      });
      expect(RalphParser.parseNpmAuditSeverity(json)).toBe('moderate');
    });

    it('returns "low" when only low vulns present', () => {
      const json = JSON.stringify({
        metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 1 } },
      });
      expect(RalphParser.parseNpmAuditSeverity(json)).toBe('low');
    });

    it('falls back to text parsing for invalid JSON', () => {
      const text = 'found 2 vulnerabilities (1 high, 1 moderate)';
      expect(RalphParser.parseNpmAuditSeverity(text)).toBe('high');
    });

    it('returns "none" for empty JSON', () => {
      expect(RalphParser.parseNpmAuditSeverity('{}')).toBe('none');
    });
  });

  describe('parseSecurityOutputText', () => {
    it('detects critical severity from text', () => {
      expect(RalphParser.parseSecurityOutputText('1 critical vulnerability found')).toBe('critical');
    });

    it('detects high severity from text', () => {
      expect(RalphParser.parseSecurityOutputText('2 high severity issues')).toBe('high');
    });

    it('detects moderate severity from text', () => {
      expect(RalphParser.parseSecurityOutputText('3 moderate vulnerabilities')).toBe('moderate');
    });

    it('detects low severity from text', () => {
      expect(RalphParser.parseSecurityOutputText('5 low severity')).toBe('low');
    });

    it('returns "none" for clean output', () => {
      expect(RalphParser.parseSecurityOutputText('found 0 vulnerabilities')).toBe('none');
    });

    it('critical takes precedence over high', () => {
      expect(RalphParser.parseSecurityOutputText('1 critical, 2 high issues')).toBe('critical');
    });
  });

  describe('securityGatePasses', () => {
    it('passes when no vulnerabilities found (failOn: high)', () => {
      expect(RalphParser.securityGatePasses('none', 'high')).toBe(true);
    });

    it('passes when only moderate vulns found (failOn: high)', () => {
      expect(RalphParser.securityGatePasses('moderate', 'high')).toBe(true);
    });

    it('fails when high vulns found (failOn: high)', () => {
      expect(RalphParser.securityGatePasses('high', 'high')).toBe(false);
    });

    it('fails when critical vulns found (failOn: high)', () => {
      expect(RalphParser.securityGatePasses('critical', 'high')).toBe(false);
    });

    it('passes when high vulns found (failOn: critical)', () => {
      expect(RalphParser.securityGatePasses('high', 'critical')).toBe(true);
    });

    it('fails when critical vulns found (failOn: critical)', () => {
      expect(RalphParser.securityGatePasses('critical', 'critical')).toBe(false);
    });

    it('fails when moderate vulns found (failOn: moderate)', () => {
      expect(RalphParser.securityGatePasses('moderate', 'moderate')).toBe(false);
    });

    it('fails when low vulns found (failOn: low)', () => {
      expect(RalphParser.securityGatePasses('low', 'low')).toBe(false);
    });

    it('passes when no vulns found (failOn: low)', () => {
      expect(RalphParser.securityGatePasses('none', 'low')).toBe(true);
    });
  });
});
