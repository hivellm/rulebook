import { describe, it, expect } from 'vitest';
import {
  parseReviewOutput,
  buildReviewPrompt,
  formatReviewTerminal,
  hasFailingIssues,
  formatReviewMarkdown,
} from '../src/core/review-manager.js';
import type { ReviewIssue, ReviewResult } from '../src/core/review-manager.js';

// ─── parseReviewOutput ──────────────────────────────────────────────────────

describe('parseReviewOutput', () => {
  it('should parse valid AI output with multiple issues', () => {
    const output = [
      '## Summary',
      'The PR adds a new authentication module with some issues.',
      '',
      '## Issues',
      '- [CRITICAL] auth.ts:42 — SQL injection vulnerability in user query',
      '- [MAJOR] auth.ts:78 — Missing rate limiting on login endpoint',
      '- [MINOR] utils.ts:10 — Unused import left in file',
      '- [SUGGESTION] auth.ts:55 — Consider extracting validation logic',
      '',
      '## Suggestions',
      '- Add input sanitization for all user-provided strings',
      '- Consider using parameterized queries throughout',
    ].join('\n');

    const result = parseReviewOutput(output);

    expect(result.summary).toBe(
      'The PR adds a new authentication module with some issues.',
    );
    expect(result.issues).toHaveLength(4);
    expect(result.suggestions).toHaveLength(2);
    expect(result.approved).toBe(false);

    // Verify issue details
    expect(result.issues[0]).toEqual({
      severity: 'critical',
      file: 'auth.ts',
      line: 42,
      message: 'SQL injection vulnerability in user query',
    });

    expect(result.issues[1]).toEqual({
      severity: 'major',
      file: 'auth.ts',
      line: 78,
      message: 'Missing rate limiting on login endpoint',
    });

    expect(result.issues[2]).toEqual({
      severity: 'minor',
      file: 'utils.ts',
      line: 10,
      message: 'Unused import left in file',
    });

    expect(result.issues[3]).toEqual({
      severity: 'suggestion',
      file: 'auth.ts',
      line: 55,
      message: 'Consider extracting validation logic',
    });
  });

  it('should return approved=true and empty issues when no issues found', () => {
    const output = [
      '## Summary',
      'The code looks great. No issues found.',
      '',
      '## Issues',
      '',
      '## Suggestions',
      '- Keep up the good work',
    ].join('\n');

    const result = parseReviewOutput(output);

    expect(result.approved).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.summary).toBe('The code looks great. No issues found.');
    expect(result.suggestions).toEqual(['Keep up the good work']);
  });

  it('should return approved=false when a CRITICAL issue is present', () => {
    const output = [
      '## Summary',
      'Found a critical security flaw.',
      '',
      '## Issues',
      '- [CRITICAL] server.ts:1 — Hardcoded secret key exposed',
      '',
      '## Suggestions',
      '- Use environment variables for secrets',
    ].join('\n');

    const result = parseReviewOutput(output);

    expect(result.approved).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe('critical');
  });

  it('should return approved=false when a MAJOR issue is present', () => {
    const output = [
      '## Summary',
      'Found a major issue.',
      '',
      '## Issues',
      '- [MAJOR] api.ts:100 — Unhandled promise rejection in request handler',
      '',
      '## Suggestions',
      '',
    ].join('\n');

    const result = parseReviewOutput(output);

    expect(result.approved).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe('major');
  });

  it('should return approved=true when only MINOR and SUGGESTION issues are present', () => {
    const output = [
      '## Summary',
      'Minor cleanup needed.',
      '',
      '## Issues',
      '- [MINOR] config.ts:5 — Prefer const over let for immutable binding',
      '- [SUGGESTION] index.ts:12 — Consider adding JSDoc comment',
      '',
      '## Suggestions',
      '- Run the linter for auto-fixes',
    ].join('\n');

    const result = parseReviewOutput(output);

    expect(result.approved).toBe(true);
    expect(result.issues).toHaveLength(2);
  });

  it('should handle issues without file:line reference', () => {
    const output = [
      '## Summary',
      'General feedback.',
      '',
      '## Issues',
      '- [MINOR] Consider improving error messages overall',
      '',
      '## Suggestions',
      '',
    ].join('\n');

    const result = parseReviewOutput(output);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].file).toBeUndefined();
    expect(result.issues[0].line).toBeUndefined();
    expect(result.issues[0].message).toBe(
      'Consider improving error messages overall',
    );
  });

  it('should handle missing sections gracefully', () => {
    const output = 'Some random AI output without proper sections.';

    const result = parseReviewOutput(output);

    expect(result.summary).toBe('');
    expect(result.issues).toHaveLength(0);
    expect(result.suggestions).toHaveLength(0);
    expect(result.approved).toBe(true);
  });

  it('should handle issue with file but no line number', () => {
    const output = [
      '## Summary',
      'Found an issue.',
      '',
      '## Issues',
      '- [MAJOR] config.json — Missing required field "version"',
      '',
      '## Suggestions',
      '',
    ].join('\n');

    const result = parseReviewOutput(output);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].file).toBe('config.json');
    expect(result.issues[0].line).toBeUndefined();
    expect(result.issues[0].message).toBe('Missing required field "version"');
  });

  it('should parse issues with mixed case severity labels', () => {
    const output = [
      '## Summary',
      'Review done.',
      '',
      '## Issues',
      '- [Critical] app.ts:1 — Issue one',
      '- [major] app.ts:2 — Issue two',
      '',
      '## Suggestions',
      '',
    ].join('\n');

    const result = parseReviewOutput(output);

    // The regex uses the `i` flag so case-insensitive matching works
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].severity).toBe('critical');
    expect(result.issues[1].severity).toBe('major');
  });
});

// ─── buildReviewPrompt ──────────────────────────────────────────────────────

describe('buildReviewPrompt', () => {
  it('should return a string containing "Review" and the diff content', () => {
    const diff = '+ const x = 1;\n- const x = 2;';
    const prompt = buildReviewPrompt(diff, { projectName: 'test-project' });

    expect(prompt).toContain('Review');
    expect(prompt).toContain(diff);
    expect(prompt).toContain('test-project');
  });

  it('should include AGENTS.md content when provided', () => {
    const diff = '+ line';
    const agentsContent = 'Always write tests before implementation.';
    const prompt = buildReviewPrompt(diff, {
      agentsMdContent: agentsContent,
      projectName: 'my-app',
    });

    expect(prompt).toContain(agentsContent);
    expect(prompt).toContain('my-app');
  });

  it('should truncate AGENTS.md content to 2000 characters', () => {
    const diff = '+ line';
    const longContent = 'A'.repeat(5000);
    const prompt = buildReviewPrompt(diff, { agentsMdContent: longContent });

    // The prompt should not contain the full 5000-char string
    expect(prompt).not.toContain(longContent);
    // But it should contain the first 2000 chars
    expect(prompt).toContain('A'.repeat(2000));
  });

  it('should handle missing project name and agents content', () => {
    const diff = '+ hello';
    const prompt = buildReviewPrompt(diff, {});

    expect(prompt).toContain('(unknown)');
    expect(prompt).toContain('no project guidelines available');
    expect(prompt).toContain(diff);
  });

  it('should include formatting instructions for AI output', () => {
    const diff = '+ something';
    const prompt = buildReviewPrompt(diff, { projectName: 'p' });

    expect(prompt).toContain('## Summary');
    expect(prompt).toContain('## Issues');
    expect(prompt).toContain('## Suggestions');
    expect(prompt).toContain('CRITICAL|MAJOR|MINOR|SUGGESTION');
  });
});

// ─── formatReviewTerminal ───────────────────────────────────────────────────

describe('formatReviewTerminal', () => {
  it('should show approved indicator when approved=true', () => {
    const result: ReviewResult = {
      summary: 'All good.',
      issues: [],
      suggestions: [],
      approved: true,
    };

    const output = formatReviewTerminal(result);

    expect(output).toContain('APPROVED');
    expect(output).toContain('No issues found');
  });

  it('should show rejected indicator when approved=false', () => {
    const result: ReviewResult = {
      summary: 'Problems found.',
      issues: [
        { severity: 'critical', message: 'Bad thing', file: 'x.ts', line: 1 },
      ],
      suggestions: [],
      approved: false,
    };

    const output = formatReviewTerminal(result);

    expect(output).toContain('REJECTED');
    expect(output).toContain('critical');
  });

  it('should display summary and suggestions', () => {
    const result: ReviewResult = {
      summary: 'Decent code with room for improvement.',
      issues: [
        { severity: 'minor', message: 'Unused variable', file: 'a.ts', line: 5 },
      ],
      suggestions: ['Run the formatter', 'Add JSDoc comments'],
      approved: true,
    };

    const output = formatReviewTerminal(result);

    expect(output).toContain('Decent code with room for improvement.');
    expect(output).toContain('Run the formatter');
    expect(output).toContain('Add JSDoc comments');
  });

  it('should display issue counts by severity', () => {
    const result: ReviewResult = {
      summary: 'Mixed review.',
      issues: [
        { severity: 'critical', message: 'A' },
        { severity: 'major', message: 'B' },
        { severity: 'major', message: 'C' },
        { severity: 'minor', message: 'D' },
        { severity: 'suggestion', message: 'E' },
      ],
      suggestions: [],
      approved: false,
    };

    const output = formatReviewTerminal(result);

    expect(output).toContain('1 critical');
    expect(output).toContain('2 major');
    expect(output).toContain('1 minor');
    expect(output).toContain('1 suggestion');
  });
});

// ─── hasFailingIssues ───────────────────────────────────────────────────────

describe('hasFailingIssues', () => {
  const issues: ReviewIssue[] = [
    { severity: 'minor', message: 'A' },
    { severity: 'suggestion', message: 'B' },
  ];

  it('should return false when no issues meet the threshold', () => {
    expect(hasFailingIssues(issues, 'major')).toBe(false);
    expect(hasFailingIssues(issues, 'critical')).toBe(false);
  });

  it('should return true when an issue meets the threshold', () => {
    expect(hasFailingIssues(issues, 'minor')).toBe(true);
  });

  it('should return true for critical when critical issue is present', () => {
    const withCritical: ReviewIssue[] = [
      ...issues,
      { severity: 'critical', message: 'C' },
    ];
    expect(hasFailingIssues(withCritical, 'critical')).toBe(true);
  });

  it('should return true for major when critical issue is present', () => {
    const withCritical: ReviewIssue[] = [
      { severity: 'critical', message: 'C' },
    ];
    expect(hasFailingIssues(withCritical, 'major')).toBe(true);
  });

  it('should return false for empty issues array', () => {
    expect(hasFailingIssues([], 'critical')).toBe(false);
    expect(hasFailingIssues([], 'minor')).toBe(false);
  });
});

// ─── formatReviewMarkdown ───────────────────────────────────────────────────

describe('formatReviewMarkdown', () => {
  it('should produce valid markdown with approval icon', () => {
    const result: ReviewResult = {
      summary: 'Looks good.',
      issues: [],
      suggestions: [],
      approved: true,
    };

    const md = formatReviewMarkdown(result);

    expect(md).toContain(':white_check_mark:');
    expect(md).toContain('Rulebook AI Review');
    expect(md).toContain('Looks good.');
  });

  it('should produce valid markdown with rejection icon', () => {
    const result: ReviewResult = {
      summary: 'Not good.',
      issues: [
        { severity: 'critical', file: 'a.ts', line: 1, message: 'Problem' },
      ],
      suggestions: ['Fix it'],
      approved: false,
    };

    const md = formatReviewMarkdown(result);

    expect(md).toContain(':x:');
    expect(md).toContain('**[CRITICAL]**');
    expect(md).toContain('`a.ts:1`');
    expect(md).toContain('Fix it');
  });
});
