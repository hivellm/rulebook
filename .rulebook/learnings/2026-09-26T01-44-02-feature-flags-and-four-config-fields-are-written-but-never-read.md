# Feature flags and four config fields are written but never read
**Source**: manual
**Date**: 2026-09-26
**Tags**: analysis:rulebook-simplification
The 7 features.* booleans in RulebookConfig (types.ts ~170-178) and `rulebook config --feature` change nothing: zero reads in src/. timeouts.*, maxParallelTasks, outputLanguage and cliTools are written by config-manager.ts and never read. src/core/logger.ts (361 lines) has no importer in src/ — getLogger() would throw because nothing calls initializeLogger(). Remove in 7.5 with migrateConfig dropping the keys.