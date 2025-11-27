import { access, mkdir, writeFile, unlink, readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LanguageDetection } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface HookGenerationOptions {
  languages: LanguageDetection[];
  cwd: string;
}

const LANGUAGE_HOOK_MAP: Record<string, string> = {
  typescript: 'typescript',
  javascript: 'typescript',
  rust: 'rust',
  python: 'python',
  go: 'go',
  java: 'java',
  csharp: 'csharp',
  php: 'php',
  ruby: 'ruby',
  elixir: 'elixir',
  kotlin: 'kotlin',
  swift: 'swift',
  scala: 'scala',
  dart: 'dart',
  erlang: 'erlang',
  haskell: 'haskell',
};

async function loadHookTemplate(
  language: string,
  hookType: 'pre-commit' | 'pre-push'
): Promise<string | null> {
  try {
    const templatePath = path.join(
      __dirname,
      '../../templates/hooks',
      `${language}-${hookType}.sh`
    );
    return await readFile(templatePath, 'utf-8');
  } catch {
    return null;
  }
}

function parseShellHookToNode(hookContent: string): string[] {
  const commands: string[] = [];
  const lines = hookContent.split('\n');
  let insideConditional = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Track conditional blocks
    if (trimmed.startsWith('if ') || trimmed.startsWith('elif ')) {
      insideConditional = true;
      continue;
    }
    if (trimmed === 'fi') {
      insideConditional = false;
      continue;
    }

    // Skip echo and exit statements
    if (trimmed.startsWith('echo') || trimmed.startsWith('exit')) {
      continue;
    }

    // Extract command before || exit 1 or similar
    const mainCommand = trimmed.split('||')[0].trim().split('{')[0].trim();
    const options = insideConditional ? ', { allowFailure: true }' : '';

    // Skip shell-specific commands and conditionals, but try to extract commands from them
    if (mainCommand.startsWith('if ') || mainCommand.startsWith('$(')) {
      // Try to extract commands from complex conditionals (e.g., "if [ "$(gofmt -l . | wc -l)" -gt 0 ]")
      if (mainCommand.includes('gofmt')) {
        // Extract gofmt command from conditional
        const gofmtMatch = mainCommand.match(/gofmt\s+(-l|-w)?\s*\.?/);
        if (gofmtMatch) {
          commands.push(`await runCommand('gofmt', ['-l', '.']${options});`);
        }
      }
      continue;
    }
    if (mainCommand.startsWith('[') && !mainCommand.includes('gofmt')) {
      continue;
    }

    // Parse npm/npx commands
    if (mainCommand.startsWith('npm run ')) {
      const script = mainCommand.replace('npm run ', '').trim();
      commands.push(`await runCommand('npm', ['run', '${script}']${options});`);
    } else if (mainCommand.startsWith('npx ')) {
      const parts = mainCommand.replace('npx ', '').trim();
      const partsArray = parts.split(/\s+/).filter((p) => p && !p.startsWith('2>'));
      const cmd = partsArray[0];
      const args = partsArray.slice(1).filter((arg) => arg && !arg.match(/^["'].*["']$/));
      if (args.length > 0) {
        commands.push(`await runCommand('npx', ['${cmd}', ...${JSON.stringify(args)}]${options});`);
      } else {
        commands.push(`await runCommand('npx', ['${cmd}']${options});`);
      }
    } else if (mainCommand === 'npm test' || mainCommand.startsWith('npm test ')) {
      commands.push(`await runCommand('npm', ['test']${options});`);
    } else if (mainCommand === 'npm run build' || mainCommand.startsWith('npm run build ')) {
      commands.push(`await runCommand('npm', ['run', 'build']${options});`);
    } else {
      // Parse other commands (cargo, go, python tools, etc.)
      // Split command and arguments
      const parts = mainCommand.split(/\s+/).filter((p) => p && !p.startsWith('2>'));
      if (parts.length > 0) {
        const cmd = parts[0];
        const args = parts.slice(1).filter((arg) => {
          // Filter out shell-specific syntax
          return (
            arg &&
            !arg.match(/^["'].*["']$/) &&
            !arg.startsWith('$') &&
            !arg.includes('|') &&
            !arg.includes('&&')
          );
        });

        // Only add if it's a recognized command (not a shell builtin)
        const recognizedCommands = [
          'cargo',
          'go',
          'gofmt',
          'black',
          'ruff',
          'flake8',
          'mypy',
          'pytest',
          'python',
          'python3',
          'golangci-lint',
          'make',
        ];
        if (recognizedCommands.includes(cmd) || cmd.startsWith('./')) {
          if (args.length > 0) {
            commands.push(`await runCommand('${cmd}', ${JSON.stringify(args)}${options});`);
          } else {
            commands.push(`await runCommand('${cmd}', []${options});`);
          }
        }
      }
    }
  }

  return commands;
}

export async function installGitHooks(options: HookGenerationOptions): Promise<void> {
  const { languages, cwd } = options;

  const gitDir = path.join(cwd, '.git');
  try {
    await access(gitDir);
  } catch {
    throw new Error('Git repository not initialized. Run "git init" before installing hooks.');
  }

  const hooksDir = path.join(gitDir, 'hooks');

  // Ensure hooks directory exists
  await mkdir(hooksDir, { recursive: true });

  // Clean up old hook files that might cause conflicts
  const oldHookFiles = [
    'pre-commit-internal',
    'pre-push-internal',
    'pre-commit-internal.sh',
    'pre-push-internal.sh',
  ];
  for (const oldFile of oldHookFiles) {
    try {
      await unlink(path.join(hooksDir, oldFile));
    } catch {
      // Ignore if file doesn't exist
    }
  }

  // Generate and install pre-commit hook
  const { shellScript, nodeScript } = await generatePreCommitHook(languages, cwd);
  const preCommitShellPath = path.join(hooksDir, 'pre-commit');
  const preCommitNodePath = path.join(hooksDir, 'pre-commit.js');
  await writeFile(preCommitShellPath, shellScript, { mode: 0o755 });
  await writeFile(preCommitNodePath, nodeScript, { mode: 0o644 });

  // Generate and install pre-push hook
  const { shellScript: prePushShell, nodeScript: prePushNode } = await generatePrePushHook(
    languages,
    cwd
  );
  const prePushShellPath = path.join(hooksDir, 'pre-push');
  const prePushNodePath = path.join(hooksDir, 'pre-push.js');
  await writeFile(prePushShellPath, prePushShell, { mode: 0o755 });
  await writeFile(prePushNodePath, prePushNode, { mode: 0o644 });
}

async function generatePreCommitHook(
  languages: LanguageDetection[],
  cwd: string
): Promise<{ shellScript: string; nodeScript: string }> {
  const commands: string[] = [];
  const packageJsonPath = path.join(cwd, 'package.json');
  const hasTypeScript = languages.some(
    (l) => l.language === 'typescript' || l.language === 'javascript'
  );

  // Check if package.json exists and read scripts
  let hasPackageJson = false;
  let packageJson: any = {};

  try {
    if (
      await access(packageJsonPath)
        .then(() => true)
        .catch(() => false)
    ) {
      hasPackageJson = true;
      packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    }
  } catch {
    // Ignore
  }

  // Try to load template for each language
  for (const lang of languages) {
    const mappedLang = LANGUAGE_HOOK_MAP[lang.language];
    if (!mappedLang) continue;

    const template = await loadHookTemplate(mappedLang, 'pre-commit');
    if (template) {
      const parsedCommands = parseShellHookToNode(template);
      if (parsedCommands.length > 0) {
        commands.push(...parsedCommands);
      }
    }
  }

  // TypeScript/JavaScript specific checks - add common commands if TypeScript detected
  // Templates may not parse perfectly, so we add fallback commands
  if (hasTypeScript) {
    // Always add lint command for TypeScript projects
    if (!commands.some((c) => c.includes("'lint'"))) {
      commands.push(`await runCommand('npm', ['run', 'lint'], { allowFailure: true });`);
    }
    // Add type-check if not already present
    if (!commands.some((c) => c.includes("'type-check'"))) {
      commands.push(`await runCommand('npm', ['run', 'type-check'], { allowFailure: true });`);
    }
  }

  // Generic fallback
  if (commands.length === 0) {
    if (hasPackageJson && packageJson.scripts?.test) {
      commands.push(`await runCommand('npm', ['test']);`);
    }
  }

  const nodeScript = generateNodeScript('pre-commit', commands);
  const shellScript = generateShellWrapper('pre-commit');
  return { shellScript, nodeScript };
}

async function generatePrePushHook(
  languages: LanguageDetection[],
  cwd: string
): Promise<{ shellScript: string; nodeScript: string }> {
  const commands: string[] = [];
  const packageJsonPath = path.join(cwd, 'package.json');
  const hasTypeScript = languages.some(
    (l) => l.language === 'typescript' || l.language === 'javascript'
  );

  // Check if package.json exists and read scripts
  let hasPackageJson = false;
  let packageJson: any = {};

  try {
    if (
      await access(packageJsonPath)
        .then(() => true)
        .catch(() => false)
    ) {
      hasPackageJson = true;
      packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    }
  } catch {
    // Ignore
  }

  // Try to load template for each language
  for (const lang of languages) {
    const mappedLang = LANGUAGE_HOOK_MAP[lang.language];
    if (!mappedLang) continue;

    const template = await loadHookTemplate(mappedLang, 'pre-push');
    if (template) {
      const parsedCommands = parseShellHookToNode(template);
      if (parsedCommands.length > 0) {
        commands.push(...parsedCommands);
      }
    }
  }

  // TypeScript/JavaScript specific checks - add common commands if TypeScript detected
  if (hasTypeScript) {
    // Always add build command for TypeScript projects
    if (!commands.some((c) => c.includes("'build'"))) {
      commands.push(`await runCommand('npm', ['run', 'build'], { allowFailure: true });`);
    }
    // Add test if not already present
    if (!commands.some((c) => c.includes("'test'") && !c.includes("'test:coverage'"))) {
      commands.push(`await runCommand('npm', ['test'], { allowFailure: true });`);
    }
  }

  // Generic fallback
  if (commands.length === 0) {
    if (hasPackageJson && packageJson.scripts?.build) {
      commands.push(`await runCommand('npm', ['run', 'build']);`);
    }
  }

  const nodeScript = generateNodeScript('pre-push', commands);
  const shellScript = generateShellWrapper('pre-push');
  return { shellScript, nodeScript };
}

function generateShellWrapper(hookType: 'pre-commit' | 'pre-push'): string {
  // Cross-platform shell wrapper that works on both Windows (Git Bash) and Linux
  // Using explicit file descriptor handling to avoid "Bad fd number" errors
  return `#!/bin/sh
# Git ${hookType === 'pre-commit' ? 'Pre-Commit' : 'Pre-Push'} Hook Wrapper
# Generated by @hivellm/rulebook
# Cross-platform wrapper that works on Windows and Linux

set -e

# Get the directory where this script is located
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_SCRIPT="$HOOK_DIR/${hookType}.js"

# Verify Node.js script exists
if [ ! -f "$NODE_SCRIPT" ]; then
  echo "❌ Hook script not found: $NODE_SCRIPT" >&2
  exit 1
fi

# Try to find node in common locations
NODE_CMD=""
if command -v node >/dev/null 2>/dev/null; then
  NODE_CMD="node"
elif [ -f "/usr/bin/node" ]; then
  NODE_CMD="/usr/bin/node"
elif [ -f "/usr/local/bin/node" ]; then
  NODE_CMD="/usr/local/bin/node"
elif [ -f "/c/Program Files/nodejs/node.exe" ]; then
  NODE_CMD="/c/Program Files/nodejs/node.exe"
elif [ -f "/c/Program Files (x86)/nodejs/node.exe" ]; then
  NODE_CMD="/c/Program Files (x86)/nodejs/node.exe"
fi

# Check if node was found
if [ -z "$NODE_CMD" ]; then
  echo "❌ Node.js not found. Please install Node.js to use git hooks." >&2
  exit 1
fi

# Execute the Node.js script
exec "$NODE_CMD" "$NODE_SCRIPT"
`;
}

function generateNodeScript(hookType: 'pre-commit' | 'pre-push', commands: string[]): string {
  const hookName = hookType === 'pre-commit' ? 'Pre-Commit' : 'Pre-Push';
  const emoji = hookType === 'pre-commit' ? '🔍' : '🚀';

  if (commands.length === 0) {
    return `// Git ${hookName} Hook
// Generated by @hivellm/rulebook
// Cross-platform hook that works on Windows and Linux

process.exit(0);
`;
  }

  return `// Git ${hookName} Hook
// Generated by @hivellm/rulebook
// Cross-platform hook that works on Windows and Linux

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Go up from .git/hooks to project root
const projectRoot = join(__dirname, '..', '..');

function runCommand(command: string, args: string[] = [], options: { allowFailure?: boolean } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(\`  → Running: \${command} \${args.join(' ')}\`);
    
    const isWindows = process.platform === 'win32';
    const cmd = isWindows && !command.includes('/') && !command.includes('\\\\') ? command + '.cmd' : command;
    const child = spawn(cmd, args, {
      cwd: projectRoot,
      stdio: ['ignore', 'inherit', 'inherit'],
      shell: isWindows,
      env: { ...process.env }
    });

    child.on('close', (code) => {
      if (code === null) {
        // Process was killed
        if (options.allowFailure) {
          resolve();
        } else {
          console.error(\`❌ \${command} was terminated\`);
          reject(new Error(\`Command terminated: \${command}\`));
        }
      } else if (code === 0) {
        resolve();
      } else if (options.allowFailure) {
        resolve();
      } else {
        console.error(\`❌ \${command} failed with exit code \${code}\`);
        reject(new Error(\`Command failed: \${command}\`));
      }
    });

    child.on('error', (error) => {
      if (options.allowFailure) {
        resolve();
      } else {
        console.error(\`❌ Error running \${command}:\`, error.message);
        reject(error);
      }
    });
  });
}

async function main() {
  console.log(\`${emoji} Running ${hookName.toLowerCase()} checks...\`);

${commands.map((cmd) => `  ${cmd}`).join('\n')}

  console.log(\`✅ All ${hookName.toLowerCase()} checks passed!\`);
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Hook failed:', error.message);
  process.exit(1);
});
`;
}

export async function uninstallGitHooks(cwd: string): Promise<void> {
  const hooksDir = path.join(cwd, '.git', 'hooks');

  // Remove shell wrappers
  try {
    await unlink(path.join(hooksDir, 'pre-commit'));
  } catch {
    // Ignore if file doesn't exist
  }

  try {
    await unlink(path.join(hooksDir, 'pre-push'));
  } catch {
    // Ignore if file doesn't exist
  }

  // Remove Node.js scripts
  try {
    await unlink(path.join(hooksDir, 'pre-commit.js'));
  } catch {
    // Ignore if file doesn't exist
  }

  try {
    await unlink(path.join(hooksDir, 'pre-push.js'));
  } catch {
    // Ignore if file doesn't exist
  }
}
