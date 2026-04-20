#!/usr/bin/env node
/**
 * Rulebook evals — snapshot generator via Claude Code CLI.
 *
 * Alternative to `llm_run.ts` (which uses @anthropic-ai/sdk directly).
 * This script shells out to `claude -p` so the existing Claude Code
 * auth is reused, no API key or optional SDK dependency required.
 *
 * Each prompt is run against every arm:
 *   - baseline:       no --system-prompt flag
 *   - terse:          `Answer concisely. No preamble, no restating...`
 *   - rulebook-terse: `Answer concisely.` + SKILL.md body
 *
 * The CLI is invoked from a throwaway cwd so repo-local hooks and
 * CLAUDE.md don't poison the responses — each run starts from a
 * clean session.
 *
 * Writes `evals/snapshots/results.json`.
 */

import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

interface Arm {
  id: string;
  systemPrompt?: string;
  systemPromptPrefix?: string;
  skillFile?: string;
}

interface ArmsFile {
  arms: Arm[];
}

function buildSystemPrompt(arm: Arm, root: string): string | null {
  if (arm.systemPromptPrefix) {
    const skillPath = arm.skillFile ? resolve(root, arm.skillFile) : '';
    const skillBody = skillPath ? readFileSync(skillPath, 'utf8') : '';
    return `${arm.systemPromptPrefix}\n\n${skillBody}`.trim();
  }
  if (arm.systemPrompt && arm.systemPrompt.trim().length > 0) {
    return arm.systemPrompt;
  }
  return null;
}

function runClaudeCli(
  prompt: string,
  systemPrompt: string | null,
  cwd: string
): { output: string; exitCode: number; stderr: string } {
  const args = ['-p'];
  if (systemPrompt !== null) {
    args.push('--system-prompt', systemPrompt);
  }
  args.push(prompt);

  const result = spawnSync('claude', args, {
    cwd,
    encoding: 'utf8',
    timeout: 120_000,
    shell: false,
  });

  return {
    output: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? -1,
  };
}

async function main(): Promise<number> {
  const root = process.cwd();
  const arms: ArmsFile = JSON.parse(
    readFileSync(resolve(root, 'evals/arms.json'), 'utf8')
  );
  const prompts = readFileSync(resolve(root, 'evals/prompts/en.txt'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  console.log(`Prompts: ${prompts.length}`);
  console.log(`Arms:    ${arms.arms.map((a) => a.id).join(', ')}`);
  console.log(`Runner:  claude CLI (shells out to \`claude -p\`)`);
  console.log('');

  // Isolated cwd so repo-local hooks + CLAUDE.md don't bleed into the
  // baseline / terse arms.
  const isolatedCwd = mkdtempSync(join(tmpdir(), 'rulebook-eval-cli-'));

  const results: Array<{
    id: string;
    prompt: string;
    responses: Record<string, string>;
  }> = [];

  try {
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      const id = `p${i + 1}-${prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40)}`;
      console.log(`[${i + 1}/${prompts.length}] ${id}`);

      const responses: Record<string, string> = {};
      for (const arm of arms.arms) {
        const systemPrompt = buildSystemPrompt(arm, root);
        const { output, exitCode, stderr } = runClaudeCli(prompt, systemPrompt, isolatedCwd);

        if (exitCode !== 0) {
          console.error(`  ${arm.id}: exit ${exitCode}${stderr ? ` — ${stderr.slice(0, 200)}` : ''}`);
        } else {
          const trimmed = output.trim();
          responses[arm.id] = trimmed;
          console.log(`  ${arm.id}: ${trimmed.length} chars`);
        }
      }

      if (Object.keys(responses).length === arms.arms.length) {
        results.push({ id, prompt, responses });
      } else {
        console.error(`  skipping ${id} (missing arms)`);
      }
    }
  } finally {
    try {
      rmSync(isolatedCwd, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  const snapshotPath = resolve(root, 'evals/snapshots/results.json');
  mkdirSync(resolve(root, 'evals/snapshots'), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    runner: 'claude-cli',
    note: 'Regenerated via evals/cli_run.ts — shells out to `claude -p` with per-arm --system-prompt.',
    prompts: results,
  };
  writeFileSync(snapshotPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(`\nWrote ${snapshotPath}`);
  console.log(`Prompts successfully captured: ${results.length}/${prompts.length}`);
  return results.length === prompts.length ? 0 : 1;
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main().then((code) => process.exit(code));
}
