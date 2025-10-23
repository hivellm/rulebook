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
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 75,
        statements: 90,
      },
    },
  },
});

