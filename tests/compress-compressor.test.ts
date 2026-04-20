/**
 * Unit tests for `src/core/compress/compressor.ts`.
 *
 * Verifies the deterministic prose rewriter preserves all protected
 * classes while actually reducing byte count on representative
 * fixtures.
 */

import { describe, it, expect } from 'vitest';
import { compress } from '../src/core/compress/compressor.js';

describe('compress-compressor — basic filler removal', () => {
  it('removes standalone filler words mid-sentence', () => {
    const input = 'It is really just a basically simple issue.';
    const { output, validation } = compress(input);
    expect(validation.ok).toBe(true);
    expect(output).not.toMatch(/\breally\b/);
    expect(output).not.toMatch(/\bjust\b/);
    expect(output).not.toMatch(/\bbasically\b/);
  });

  it('strips leading pleasantries from a paragraph', () => {
    const input = `Sure! I'd be happy to help. The bug is in auth.`;
    const { output } = compress(input);
    expect(output.toLowerCase()).not.toContain('sure');
    expect(output.toLowerCase()).not.toContain('happy to help');
    expect(output).toContain('The bug is in auth');
  });

  it('replaces redundant phrases', () => {
    const input = 'In order to fix the issue, make sure to run tests.';
    const { output } = compress(input);
    expect(output.toLowerCase()).not.toContain('in order to');
    expect(output.toLowerCase()).not.toContain('make sure to');
    expect(output.toLowerCase()).toContain('to fix');
    expect(output.toLowerCase()).toContain('ensure');
  });

  it('removes hedging patterns', () => {
    const input = `I think you might want to consider refactoring.`;
    const { output } = compress(input);
    expect(output.toLowerCase()).not.toContain('i think');
    expect(output.toLowerCase()).not.toContain('might want to');
  });
});

describe('compress-compressor — protected regions are inviolable', () => {
  it('does not touch fenced code blocks', () => {
    const input = '```ts\nconst really = "just a value";\n```\n\nReally just prose.';
    const { output, validation } = compress(input);
    expect(validation.ok).toBe(true);
    expect(output).toContain('const really = "just a value"');
  });

  it('does not touch inline code', () => {
    const input = 'Call `really.just()` to trigger the basic flow.';
    const { output, validation } = compress(input);
    expect(validation.ok).toBe(true);
    expect(output).toContain('`really.just()`');
  });

  it('does not touch URLs', () => {
    const input = 'See https://example.com/really-just for details.';
    const { output, validation } = compress(input);
    expect(validation.ok).toBe(true);
    expect(output).toContain('https://example.com/really-just');
  });

  it('does not touch file paths', () => {
    const input = 'Edit ./src/really/just.ts in the repo.';
    const { output, validation } = compress(input);
    expect(validation.ok).toBe(true);
    expect(output).toContain('./src/really/just.ts');
  });

  it('does not touch dates', () => {
    const input = 'Released 2026-04-01 to fans.';
    const { output, validation } = compress(input);
    expect(validation.ok).toBe(true);
    expect(output).toContain('2026-04-01');
  });

  it('does not touch version numbers', () => {
    const input = 'Upgrade to v5.4.0-pre just to test.';
    const { output, validation } = compress(input);
    expect(validation.ok).toBe(true);
    expect(output).toContain('v5.4.0-pre');
  });

  it('does not alter heading text or level', () => {
    const input = `# Main Title\n\n## Really Important Section\n\nProse goes here.`;
    const { output, validation } = compress(input);
    expect(validation.ok).toBe(true);
    expect(output).toContain('# Main Title');
    expect(output).toContain('## Really Important Section');
  });
});

describe('compress-compressor — end-to-end savings', () => {
  it('achieves > 15% savings on fluff-heavy fixture', () => {
    const input = `Sure! I'd be happy to help you with that. It is really just a basically simple issue. You might want to consider refactoring in order to make sure to handle the edge case. I think that perhaps we should essentially update the test. Actually, it would be good to just simplify the code.`;
    const { output, validation } = compress(input);
    expect(validation.ok).toBe(true);
    const ratio = validation.stats.compressedBytes / validation.stats.originalBytes;
    expect(ratio).toBeLessThan(0.85);
  });

  it('no-op on input that has no filler', () => {
    const input = `# Terse\n\nNo filler here. Pure signal.`;
    const { output, validation } = compress(input);
    expect(validation.ok).toBe(true);
    // May still normalize whitespace but should be close to identity.
    expect(validation.stats.ratio).toBeGreaterThanOrEqual(0.9);
  });

  it('validates round-trip on realistic mixed content', () => {
    const input = `# Project README

Sure, this is basically a very simple tool. It just wraps \`npm test\` behind \`rulebook test\`.

## Install

In order to install, run:

\`\`\`bash
npm install @hivehub/rulebook@5.4.0-pre
\`\`\`

See https://example.com/docs for more. Last updated 2026-04-20.`;
    const { output, validation, retries } = compress(input);
    expect(validation.ok).toBe(true);
    expect(retries).toBe(0);
    expect(output).toContain('# Project README');
    expect(output).toContain('## Install');
    expect(output).toContain('npm install @hivehub/rulebook@5.4.0-pre');
    expect(output).toContain('https://example.com/docs');
    expect(output).toContain('2026-04-20');
    expect(validation.stats.compressedBytes).toBeLessThan(validation.stats.originalBytes);
  });
});

describe('compress-compressor — retry semantics', () => {
  it('retries = 0 when validation passes on first attempt', () => {
    const input = `Really just prose.`;
    const { retries, validation } = compress(input);
    expect(validation.ok).toBe(true);
    expect(retries).toBe(0);
  });

  it('respects maxRetries option', () => {
    const input = `Prose.`;
    const { retries } = compress(input, { maxRetries: 0 });
    expect(retries).toBe(0);
  });
});
