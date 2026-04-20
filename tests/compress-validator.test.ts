/**
 * Unit tests for `src/core/compress/validator.ts`.
 *
 * Ensures every protected-region extractor catches its class of
 * content and that `validate()` flags round-trip violations.
 */

import { describe, it, expect } from 'vitest';
import { validate, extractors } from '../src/core/compress/validator.js';

describe('compress-validator — extractors', () => {
  it('extractHeadings captures level + text', () => {
    const src = `# H1\n## H2\n### H3 with punctuation!\n#### H4`;
    const h = extractors.extractHeadings(src);
    expect(h).toEqual(['1\tH1', '2\tH2', '3\tH3 with punctuation!', '4\tH4']);
  });

  it('inline-code extractor ignores code inside fenced blocks', () => {
    const src = '```ts\nconst `not-inline` = 1;\n```\n\nBut `real-inline` is.';
    const inline = extractors.extractInlineCode(src);
    expect(inline).toEqual(['real-inline']);
  });

  it('URL regex matches http and https', () => {
    const src = 'Visit http://example.com and https://example.org/path?q=1.';
    const urls = Array.from(src.matchAll(extractors.URL_RE)).map((m) => m[0]);
    expect(urls).toEqual(['http://example.com', 'https://example.org/path?q=1']);
  });

  it('DATE regex matches YYYY-MM-DD only', () => {
    const src = 'Deadline 2026-04-01, not 04-01-2026 or 04/01/2026.';
    const dates = Array.from(src.matchAll(extractors.DATE_RE)).map((m) => m[0]);
    expect(dates).toEqual(['2026-04-01']);
  });

  it('VERSION regex matches v-prefixed and bare semver', () => {
    const src = 'Use v5.3.3 or 5.4.0-pre but not "5".';
    const versions = Array.from(src.matchAll(extractors.VERSION_RE)).map((m) => m[0]);
    expect(versions).toContain('v5.3.3');
    expect(versions).toContain('5.4.0-pre');
  });

  it('PATH regex matches Unix-absolute, relative, and Windows paths', () => {
    const src = `Open ./src/foo.ts and /usr/local/bin/node and C:\\Users\\me\\file.md.`;
    const paths = Array.from(src.matchAll(extractors.PATH_RE)).map((m) => m[0]);
    expect(paths.some((p) => p.includes('src/foo.ts'))).toBe(true);
    expect(paths.some((p) => p.includes('/usr/local/bin/node'))).toBe(true);
    expect(paths.some((p) => p.includes('C:\\Users'))).toBe(true);
  });
});

describe('compress-validator — validate happy path', () => {
  it('identical input/output passes with no violations', () => {
    const src = `# Title\n\nSome prose with a \`code\` span.\n\n\`\`\`ts\nconst x = 1;\n\`\`\``;
    const result = validate(src, src);
    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.stats.ratio).toBe(1);
  });

  it('prose-only rewrite still passes when protected regions survive', () => {
    const src = `# Title\n\nReally just some filler prose with \`keep-me\` inline.`;
    const compressed = `# Title\n\nSome prose with \`keep-me\` inline.`;
    const result = validate(src, compressed);
    expect(result.ok).toBe(true);
    expect(result.stats.compressedBytes).toBeLessThan(result.stats.originalBytes);
  });
});

describe('compress-validator — violation detection', () => {
  it('flags heading text change', () => {
    const src = `# Original\n\nBody.`;
    const broken = `# Mutated\n\nBody.`;
    const result = validate(src, broken);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'heading-missing')).toBe(true);
  });

  it('flags dropped heading', () => {
    const src = `# H1\n\n## H2 expected\n\nBody.`;
    const broken = `# H1\n\nBody.`;
    const result = validate(src, broken);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'heading-missing')).toBe(true);
  });

  it('flags modified fenced code', () => {
    const src = '```ts\nconst x = 1;\n```';
    const broken = '```ts\nconst x = 2;\n```';
    const result = validate(src, broken);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'fenced-code-changed')).toBe(true);
  });

  it('flags inline-code change', () => {
    const src = 'Use `npm test`.';
    const broken = 'Use `npm run test`.';
    const result = validate(src, broken);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'inline-code-changed')).toBe(true);
  });

  it('flags URL modification', () => {
    const src = 'See https://example.com/a.';
    const broken = 'See https://example.com/b.';
    const result = validate(src, broken);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'url-changed')).toBe(true);
  });

  it('flags path modification', () => {
    const src = 'Edit ./src/index.ts.';
    const broken = 'Edit ./src/main.ts.';
    const result = validate(src, broken);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'path-changed')).toBe(true);
  });

  it('flags date modification', () => {
    const src = 'Deadline 2026-04-01.';
    const broken = 'Deadline 2026-05-01.';
    const result = validate(src, broken);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'date-changed')).toBe(true);
  });

  it('flags version modification', () => {
    const src = 'Use v5.3.3.';
    const broken = 'Use v5.4.0.';
    const result = validate(src, broken);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'version-changed')).toBe(true);
  });

  it('flags introduced protected content (e.g. invented URL)', () => {
    const src = 'No URL here.';
    const broken = 'No URL here. http://sneaky.evil';
    const result = validate(src, broken);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.kind === 'url-changed')).toBe(true);
  });
});

describe('compress-validator — stats', () => {
  it('computes a ratio < 1 when compressed is smaller', () => {
    const src = `# X\n\nSome long prose text.`;
    const compressed = `# X\n\nprose.`;
    const result = validate(src, compressed);
    expect(result.stats.ratio).toBeLessThan(1);
    expect(result.stats.ratio).toBeGreaterThan(0);
  });

  it('computes a ratio == 1 when identical', () => {
    const src = 'unchanged';
    expect(validate(src, src).stats.ratio).toBe(1);
  });
});
