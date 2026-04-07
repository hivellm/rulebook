import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { createTelemetryMiddleware, withTelemetry } from '../src/core/telemetry';

describe('telemetry (v5.3.0 F10)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-telemetry-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('disabled middleware is a no-op', () => {
    const mw = createTelemetryMiddleware({ enabled: false, dir: tmpDir });
    // Should not throw or write anything
    mw.record({ tool: 'test', latency_ms: 100, success: true, timestamp: new Date().toISOString() });
  });

  it('enabled middleware writes NDJSON records', () => {
    const mw = createTelemetryMiddleware({ enabled: true, dir: tmpDir });
    mw.record({ tool: 'rulebook_task_list', latency_ms: 42, success: true, timestamp: '2026-04-07T18:00:00Z' });
    mw.record({ tool: 'rulebook_task_create', latency_ms: 15, success: false, timestamp: '2026-04-07T18:00:01Z' });

    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(tmpDir, `${date}.ndjson`);
    const lines = require('fs').readFileSync(filePath, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(2);

    const first = JSON.parse(lines[0]);
    expect(first.tool).toBe('rulebook_task_list');
    expect(first.latency_ms).toBe(42);
    expect(first.success).toBe(true);

    const second = JSON.parse(lines[1]);
    expect(second.success).toBe(false);
  });

  it('never records arguments or content (privacy)', () => {
    const mw = createTelemetryMiddleware({ enabled: true, dir: tmpDir });
    mw.record({
      tool: 'rulebook_memory_save',
      latency_ms: 50,
      success: true,
      timestamp: '2026-04-07T18:00:00Z',
    });

    const date = new Date().toISOString().split('T')[0];
    const content = require('fs').readFileSync(path.join(tmpDir, `${date}.ndjson`), 'utf-8');
    const record = JSON.parse(content.trim());
    // Only these 4 fields should exist
    expect(Object.keys(record).sort()).toEqual(['latency_ms', 'success', 'timestamp', 'tool']);
  });

  it('withTelemetry wraps a handler and records result', async () => {
    const mw = createTelemetryMiddleware({ enabled: true, dir: tmpDir });
    const handler = async (x: number) => x * 2;
    const wrapped = withTelemetry(mw, 'test_tool', handler);

    const result = await wrapped(21);
    expect(result).toBe(42);

    const date = new Date().toISOString().split('T')[0];
    const content = require('fs').readFileSync(path.join(tmpDir, `${date}.ndjson`), 'utf-8');
    const record = JSON.parse(content.trim());
    expect(record.tool).toBe('test_tool');
    expect(record.success).toBe(true);
  });
});
