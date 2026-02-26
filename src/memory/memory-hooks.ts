/**
 * Agent Capture Hooks
 *
 * Auto-classification heuristics and capture adapters
 * for Claude Code, Cursor, and Gemini agent output.
 *
 * Also provides MCP auto-capture: intercepts tool calls
 * and automatically saves significant interactions to memory.
 */

import type { MemoryType } from './memory-types.js';

export interface CapturedMemory {
  type: MemoryType;
  title: string;
  summary?: string; // Rich contextual summary for better search relevance
  content: string;
  tags?: string[];
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
export function extractTitle(content: string, maxLength: number = 80): string {
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
 * Extract a rich summary from content with context for better search relevance
 * Captures: key concepts, decisions, patterns, gotchas, context
 */
export function extractSummary(content: string, _memoryType: MemoryType): string {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);

  // For shorter content, use it all; for longer, sample key lines
  let summary = '';

  if (content.length < 500) {
    summary = content.trim();
  } else {
    // Extract first 3 lines for context
    const firstThreeLines = lines.slice(0, 3).join(' ').trim();

    // Extract last meaningful line if different from first
    const lastLine = lines[lines.length - 1]?.trim() || '';

    // Look for key indicators
    const hasDecision = /\b(decide|chose|decision|recommend|should)\b/i.test(content);
    const hasPattern = /\b(pattern|approach|technique|method|solution)\b/i.test(content);
    const hasGotcha = /\b(gotcha|caveat|watch out|be careful|note that|important)\b/i.test(content);
    const hasError = /\b(error|fail|bug|issue|problem|crash)\b/i.test(content);

    // Build summary with type-specific context
    let contextClues = [];
    if (hasDecision) contextClues.push('decision');
    if (hasPattern) contextClues.push('pattern');
    if (hasGotcha) contextClues.push('gotcha');
    if (hasError) contextClues.push('error');

    const contextStr = contextClues.length > 0 ? ` [${contextClues.join(', ')}]` : '';

    summary = [
      firstThreeLines,
      lastLine && lastLine !== firstThreeLines ? `... ${lastLine}` : '',
      contextStr,
    ]
      .filter(Boolean)
      .join(' ')
      .substring(0, 500);
  }

  return summary || content.substring(0, 500);
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
export function captureFromClaudeCode(output: string, _sessionId: string): CapturedMemory[] {
  const chunks = splitIntoChunks(output);
  return chunks.map((chunk) => {
    const type = classifyMemory(chunk);
    return {
      type,
      title: extractTitle(chunk),
      summary: extractSummary(chunk, type),
      content: chunk,
    };
  });
}

/**
 * Capture memories from Cursor agent output
 */
export function captureFromCursor(output: string, _sessionId: string): CapturedMemory[] {
  const chunks = splitIntoChunks(output);
  return chunks.map((chunk) => {
    const type = classifyMemory(chunk);
    return {
      type,
      title: extractTitle(chunk),
      summary: extractSummary(chunk, type),
      content: chunk,
    };
  });
}

/**
 * Capture memories from Gemini agent output
 */
export function captureFromGemini(output: string, _sessionId: string): CapturedMemory[] {
  const chunks = splitIntoChunks(output);
  return chunks.map((chunk) => {
    const type = classifyMemory(chunk);
    return {
      type,
      title: extractTitle(chunk),
      summary: extractSummary(chunk, type),
      content: chunk,
    };
  });
}

// ============================================
// MCP Auto-Capture System
// ============================================

/**
 * Tools that should NOT trigger auto-capture (read-only / meta tools)
 */
const SKIP_CAPTURE_TOOLS = new Set([
  'rulebook_memory_search',
  'rulebook_memory_timeline',
  'rulebook_memory_get',
  'rulebook_memory_save', // Avoid infinite loop: save triggers auto-capture triggers save
  'rulebook_memory_stats',
  'rulebook_memory_cleanup',
  'rulebook_task_list',
  'rulebook_task_show',
  'rulebook_task_validate',
  'rulebook_skill_list',
  'rulebook_skill_show',
  'rulebook_skill_search',
  'rulebook_skill_validate',
]);

/**
 * Deduplication buffer — keeps last N titles to avoid duplicate captures
 */
const DEDUP_BUFFER_SIZE = 50;
const recentTitles: string[] = [];

function isDuplicate(title: string): boolean {
  const normalized = title.toLowerCase().trim();
  if (recentTitles.some((t) => t === normalized)) return true;
  recentTitles.push(normalized);
  if (recentTitles.length > DEDUP_BUFFER_SIZE) {
    recentTitles.shift();
  }
  return false;
}

/**
 * Build a memory from an MCP tool call and its result.
 * Returns null if the interaction is not worth capturing.
 */
export function captureFromToolCall(
  toolName: string,
  args: Record<string, unknown>,
  result: string
): CapturedMemory | null {
  // Skip read-only / meta tools
  if (SKIP_CAPTURE_TOOLS.has(toolName)) return null;

  // Skip if result indicates failure
  try {
    const parsed = JSON.parse(result);
    if (parsed.success === false) return null;
  } catch {
    // Non-JSON result — still capture
  }

  // Build content from tool name + args + result summary
  const argSummary = Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ');

  const content = `Tool: ${toolName}\nArgs: ${argSummary}\nResult: ${truncate(result, 500)}`;
  const title = buildToolCallTitle(toolName, args);

  // Dedup
  if (isDuplicate(title)) return null;

  // Classify based on tool name + args content
  const classifyInput = `${toolName} ${argSummary}`;
  const type = classifyMemory(classifyInput);

  const tags = [toolName.replace('rulebook_', '')];

  return { type, title, content, tags };
}

/**
 * Build a human-readable title for a tool call
 */
function buildToolCallTitle(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'rulebook_task_create':
      return `Created task: ${args.taskId ?? 'unknown'}`;
    case 'rulebook_task_update':
      return `Updated task ${args.taskId ?? 'unknown'} to ${args.status ?? 'unknown'}`;
    case 'rulebook_task_archive':
      return `Archived task: ${args.taskId ?? 'unknown'}`;
    case 'rulebook_task_delete':
      return `Deleted task: ${args.taskId ?? 'unknown'}`;
    case 'rulebook_task_validate':
      return `Validated task: ${args.taskId ?? 'unknown'}`;
    case 'rulebook_skill_enable':
      return `Enabled skill: ${args.skillId ?? 'unknown'}`;
    case 'rulebook_skill_disable':
      return `Disabled skill: ${args.skillId ?? 'unknown'}`;
    case 'rulebook_memory_save':
      return `Saved memory: ${args.title ?? args.type ?? 'unknown'}`;
    default:
      return `${toolName}: ${extractTitle(JSON.stringify(args), 60)}`;
  }
}

/**
 * Truncate a string to a max length
 */
function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}
