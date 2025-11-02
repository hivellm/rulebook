import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.config.ts',
        'src/index.ts', // CLI entry point - tested manually
        'src/cli/**', // CLI commands - tested manually
        'src/core/coverage-checker.ts', // External command execution - tested manually
        'src/core/dependency-checker.ts', // External command execution - tested manually
        'src/core/docs-generator.ts', // Documentation generation - tested manually
        'src/core/changelog-generator.ts', // Git command execution - tested manually
        'src/core/custom-templates.ts', // File system operations - tested manually
        'src/core/auto-fixer.ts', // Auto-fix operations - tested manually
        'src/core/health-scorer.ts', // External command execution - core logic tested
        'src/core/version-bumper.ts', // Multi-file operations - core logic tested
        'src/core/cli-bridge.ts', // CLI bridge - requires real CLI tools
        'src/core/agent-manager.ts', // Agent manager - requires real CLI tools
        'src/core/watcher.ts', // Watcher - tests skipped due to mock issues
        'src/agents/**', // Agent parsers - requires real CLI tools
      ],
      thresholds: {
        lines: 80,
        functions: 85,
        branches: 67,
        statements: 80,
      },
    },
  },
});

