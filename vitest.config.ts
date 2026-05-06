import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 seconds timeout for each test
    hookTimeout: 30000, // 30 seconds timeout for hooks
    pool: 'forks', // Use forks instead of threads (more reliable on Windows)
    poolOptions: {
      forks: {
        singleFork: false, // Use multiple forks for speed
        maxForks: 4, // Limit concurrent forks to prevent hangs
        minForks: 1,
      },
    },
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
        'src/core/docs/**', // Documentation generators - tested manually
        'src/core/console/cli-bridge.ts', // CLI bridge - requires real CLI tools
        'src/core/indexer/background-indexer.ts', // Background indexer - uses fs.watch daemon, tested manually
        'src/mcp/rulebook-server.ts', // MCP server - integration-tested via mcp-server.test.ts
        'src/memory/legacy-migrator.ts', // Optional one-shot migration - exercised only with sql.js/better-sqlite3 installed
        'src/agents/**', // Agent parsers - requires real CLI tools
      ],
      thresholds: {
        lines: 75,
        functions: 74,
        branches: 65,
        statements: 75,
      },
    },
  },
});

