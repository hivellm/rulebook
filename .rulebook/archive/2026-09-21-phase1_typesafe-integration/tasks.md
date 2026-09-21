## 1. Core
- [x] 1.1 typesafe-integration.ts: plugin detection (installed_plugins.json), idempotent install via claude CLI, token check, rule file, token instructions; RulebookConfig.integrations.typesafe

## 2. Surfaces
- [x] 2.1 rulebook init: interactive prompt (default no) + --typesafe; persist integrations.typesafe.enabled
- [x] 2.2 rulebook update: re-verify when enabled (install if missing, refresh rule, warn on missing key); ask once when never asked; --typesafe
- [x] 2.3 rulebook claude --typesafe

## 3. Tail (docs + tests — check or waive with tailWaiver)
- [x] 3.1 Update or create documentation covering the implementation
- [x] 3.2 Write tests covering the new behavior
- [x] 3.3 Run tests and confirm they pass
