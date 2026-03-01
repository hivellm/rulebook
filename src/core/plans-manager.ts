/**
 * Plans Manager — PLANS.md Session Scratchpad
 *
 * Provides AI session continuity via a persistent scratchpad file.
 * AI agents read PLANS.md at session start and update it during/after work.
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';

const PLANS_FILE = 'PLANS.md';

const CONTEXT_START = '<!-- PLANS:CONTEXT:START -->';
const CONTEXT_END = '<!-- PLANS:CONTEXT:END -->';
const TASK_START = '<!-- PLANS:TASK:START -->';
const TASK_END = '<!-- PLANS:TASK:END -->';
const HISTORY_START = '<!-- PLANS:HISTORY:START -->';
const HISTORY_END = '<!-- PLANS:HISTORY:END -->';

export interface PlansContent {
  context: string;
  currentTask: string;
  history: string;
  raw: string;
}

/**
 * Get the path to PLANS.md inside the .rulebook directory.
 */
export function getPlansPath(projectRoot: string): string {
  return join(projectRoot, '.rulebook', PLANS_FILE);
}

/**
 * Check if PLANS.md exists.
 */
export function plansExists(projectRoot: string): boolean {
  return existsSync(getPlansPath(projectRoot));
}

/**
 * Read and parse PLANS.md sections.
 * Returns null if file does not exist.
 */
export async function readPlans(projectRoot: string): Promise<PlansContent | null> {
  const plansPath = getPlansPath(projectRoot);
  if (!existsSync(plansPath)) {
    return null;
  }

  const raw = await readFile(plansPath, 'utf-8');

  return {
    context: extractSection(raw, CONTEXT_START, CONTEXT_END),
    currentTask: extractSection(raw, TASK_START, TASK_END),
    history: extractSection(raw, HISTORY_START, HISTORY_END),
    raw,
  };
}

/**
 * Create PLANS.md from template if it does not exist.
 */
export async function initPlans(projectRoot: string): Promise<boolean> {
  const plansPath = getPlansPath(projectRoot);
  if (existsSync(plansPath)) {
    return false; // Already exists
  }

  await mkdir(join(projectRoot, '.rulebook'), { recursive: true });
  const template = await loadTemplate();
  await writeFile(plansPath, template, 'utf-8');
  return true;
}

/**
 * Update the Active Context section of PLANS.md.
 */
export async function updatePlansContext(projectRoot: string, context: string): Promise<void> {
  const plansPath = getPlansPath(projectRoot);
  await mkdir(join(projectRoot, '.rulebook'), { recursive: true });
  let content = existsSync(plansPath) ? await readFile(plansPath, 'utf-8') : await loadTemplate();
  content = replaceSection(content, CONTEXT_START, CONTEXT_END, context);
  await writeFile(plansPath, content, 'utf-8');
}

/**
 * Update the Current Task section of PLANS.md.
 */
export async function updatePlansTask(projectRoot: string, task: string): Promise<void> {
  const plansPath = getPlansPath(projectRoot);
  await mkdir(join(projectRoot, '.rulebook'), { recursive: true });
  let content = existsSync(plansPath) ? await readFile(plansPath, 'utf-8') : await loadTemplate();
  content = replaceSection(content, TASK_START, TASK_END, task);
  await writeFile(plansPath, content, 'utf-8');
}

/**
 * Append an entry to the Session History section of PLANS.md.
 */
export async function appendPlansHistory(projectRoot: string, entry: string): Promise<void> {
  const plansPath = getPlansPath(projectRoot);
  await mkdir(join(projectRoot, '.rulebook'), { recursive: true });
  let content = existsSync(plansPath) ? await readFile(plansPath, 'utf-8') : await loadTemplate();

  const existing = extractSection(content, HISTORY_START, HISTORY_END);
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const newEntry = `\n### ${timestamp}\n${entry}`;
  const updated = existing.trim() ? existing + '\n' + newEntry : newEntry;

  content = replaceSection(content, HISTORY_START, HISTORY_END, updated);
  await writeFile(plansPath, content, 'utf-8');
}

/**
 * Reset PLANS.md to the template (clear context, task, and history).
 */
export async function clearPlans(projectRoot: string): Promise<void> {
  const plansPath = getPlansPath(projectRoot);
  const template = await loadTemplate();
  await mkdir(join(projectRoot, '.rulebook'), { recursive: true });
  await writeFile(plansPath, template, 'utf-8');
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function extractSection(content: string, startMarker: string, endMarker: string): string {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) return '';
  return content.slice(startIdx + startMarker.length, endIdx).trim();
}

function replaceSection(
  content: string,
  startMarker: string,
  endMarker: string,
  newValue: string
): string {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1) return content;

  const before = content.slice(0, startIdx + startMarker.length);
  const after = content.slice(endIdx);
  return `${before}\n${newValue}\n${after}`;
}

async function loadTemplate(): Promise<string> {
  // Try to load from bundled templates
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const templatePath = join(__dirname, '..', '..', 'templates', 'core', 'PLANS.md');
    if (existsSync(templatePath)) {
      return readFile(templatePath, 'utf-8');
    }
  } catch {
    // Fall through to inline template
  }

  // Inline fallback template
  return `<!-- PLANS:START -->
# Project Plans & Session Context

This file is a **persistent session scratchpad** maintained by AI agents.
It provides continuity across sessions without relying on conversation history.

## Active Context

<!-- PLANS:CONTEXT:START -->
_No active context. Start a session to populate this section._
<!-- PLANS:CONTEXT:END -->

## Current Task

<!-- PLANS:TASK:START -->
_No task in progress._
<!-- PLANS:TASK:END -->

## Session History

<!-- PLANS:HISTORY:START -->
<!-- PLANS:HISTORY:END -->
`;
}
