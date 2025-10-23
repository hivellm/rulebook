import { fileExists, readFile } from './file-system.js';
import path from 'path';

export interface RulesIgnore {
  patterns: string[];
  isIgnored: (ruleName: string) => boolean;
}

export async function parseRulesIgnore(cwd: string = process.cwd()): Promise<RulesIgnore> {
  const rulesIgnorePath = path.join(cwd, '.rulesignore');
  const patterns: string[] = [];

  if (await fileExists(rulesIgnorePath)) {
    const content = await readFile(rulesIgnorePath);
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (trimmed && !trimmed.startsWith('#')) {
        patterns.push(trimmed);
      }
    }
  }

  return {
    patterns,
    isIgnored: (ruleName: string) => {
      return patterns.some((pattern) => {
        if (pattern.endsWith('/*')) {
          // Match prefix (e.g., "typescript/*" matches "typescript/anything")
          const prefix = pattern.slice(0, -2);
          return ruleName.startsWith(prefix + '/');
        } else if (pattern.includes('*')) {
          // Simple glob matching
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(ruleName);
        } else {
          // Exact match
          return ruleName === pattern;
        }
      });
    },
  };
}

export function filterRules<T extends { name: string }>(
  rules: T[],
  rulesIgnore: RulesIgnore
): T[] {
  return rules.filter((rule) => !rulesIgnore.isIgnored(rule.name));
}

