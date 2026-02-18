/**
 * Agent Capture Hooks
 *
 * Auto-classification heuristics and capture adapters
 * for Claude Code, Cursor, and Gemini agent output.
 */

import type { MemoryType } from './memory-types.js';

interface CapturedMemory {
  type: MemoryType;
  title: string;
  content: string;
}

const CLASSIFICATION_RULES: Array<{ pattern: RegExp; type: MemoryType }> = [
  { pattern: /\b(fix|bug|error|crash|failure|broken|patch)\b/i, type: 'bugfix' },
  { pattern: /\b(add|new|feature|create|implement|introduce)\b/i, type: 'feature' },
  { pattern: /\b(refactor|restructure|reorganize|cleanup|simplify)\b/i, type: 'refactor' },
  { pattern: /\b(decide|chose|decision|pick|select|prefer)\b/i, type: 'decision' },
  { pattern: /\b(found|discover|learn|realize|notice|insight)\b/i, type: 'discovery' },
  { pattern: /\b(change|update|modify|adjust|tweak|alter)\b/i, type: 'change' },
];

/**
 * Classify memory content by type using keyword heuristics
 */
export function classifyMemory(content: string): MemoryType {
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.pattern.test(content)) {
      return rule.type;
    }
  }
  return 'observation';
}

/**
 * Extract a short title from content (first meaningful line, truncated)
 */
function extractTitle(content: string, maxLength: number = 80): string {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  const firstLine = lines[0] ?? 'Untitled';

  // Remove markdown/code markers
  const cleaned = firstLine
    .replace(/^[#*\->\s]+/, '')
    .replace(/`/g, '')
    .trim();

  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength - 3) + '...';
}

/**
 * Split agent output into meaningful chunks for memory capture
 */
function splitIntoChunks(output: string): string[] {
  // Split by common delimiters in agent output
  const chunks = output
    .split(/(?:\n---\n|\n\n\n+|\n#{1,3}\s)/)
    .map((c) => c.trim())
    .filter((c) => c.length > 50); // Skip tiny fragments

  if (chunks.length === 0 && output.trim().length > 50) {
    return [output.trim()];
  }

  return chunks;
}

/**
 * Capture memories from Claude Code agent output
 */
export function captureFromClaudeCode(
  output: string,
  _sessionId: string
): CapturedMemory[] {
  const chunks = splitIntoChunks(output);
  return chunks.map((chunk) => ({
    type: classifyMemory(chunk),
    title: extractTitle(chunk),
    content: chunk,
  }));
}

/**
 * Capture memories from Cursor agent output
 */
export function captureFromCursor(
  output: string,
  _sessionId: string
): CapturedMemory[] {
  const chunks = splitIntoChunks(output);
  return chunks.map((chunk) => ({
    type: classifyMemory(chunk),
    title: extractTitle(chunk),
    content: chunk,
  }));
}

/**
 * Capture memories from Gemini agent output
 */
export function captureFromGemini(
  output: string,
  _sessionId: string
): CapturedMemory[] {
  const chunks = splitIntoChunks(output);
  return chunks.map((chunk) => ({
    type: classifyMemory(chunk),
    title: extractTitle(chunk),
    content: chunk,
  }));
}
