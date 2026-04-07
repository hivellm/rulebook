import path from 'path';
import { appendFileSync, existsSync, mkdirSync } from 'fs';

/**
 * v5.3.0 F10 — opt-in MCP telemetry.
 *
 * Records tool name, latency, and success/fail to a local NDJSON file
 * at `.rulebook/telemetry/YYYY-MM-DD.ndjson`. Privacy-first:
 *
 * - **Never** records arguments or content
 * - **Never** records user identity
 * - Stored locally, gitignored, opt-in (default off)
 * - Zero overhead when disabled (no-op middleware)
 */

export interface TelemetryRecord {
  tool: string;
  latency_ms: number;
  success: boolean;
  timestamp: string;
}

export interface TelemetryConfig {
  enabled: boolean;
  dir: string;
}

export function createTelemetryMiddleware(config: TelemetryConfig) {
  if (!config.enabled) {
    // No-op middleware — zero overhead when disabled
    return {
      record: (_record: TelemetryRecord) => {},
    };
  }

  // Ensure the directory exists once
  if (!existsSync(config.dir)) {
    mkdirSync(config.dir, { recursive: true });
  }

  return {
    record(rec: TelemetryRecord) {
      const date = new Date().toISOString().split('T')[0];
      const filePath = path.join(config.dir, `${date}.ndjson`);
      const line = JSON.stringify({
        tool: rec.tool,
        latency_ms: rec.latency_ms,
        success: rec.success,
        timestamp: rec.timestamp,
      });
      try {
        appendFileSync(filePath, line + '\n', 'utf-8');
      } catch {
        // Silently fail — telemetry must never break the MCP server
      }
    },
  };
}

/**
 * Wrap a tool handler with telemetry recording.
 */
export function withTelemetry<TArgs, TResult>(
  middleware: ReturnType<typeof createTelemetryMiddleware>,
  toolName: string,
  handler: (args: TArgs) => Promise<TResult>
): (args: TArgs) => Promise<TResult> {
  return async (args: TArgs) => {
    const start = Date.now();
    let success = true;
    try {
      return await handler(args);
    } catch (err) {
      success = false;
      throw err;
    } finally {
      middleware.record({
        tool: toolName,
        latency_ms: Date.now() - start,
        success,
        timestamp: new Date().toISOString(),
      });
    }
  };
}
