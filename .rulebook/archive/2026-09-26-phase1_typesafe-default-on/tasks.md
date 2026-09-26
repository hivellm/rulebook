## 1. Implementation
- [x] 1.1 decideTypesafe: drop the prompt; precedence flag true / flag false / stored / default on (persisted)
- [x] 1.2 init/update/claude call sites: drop `interactive`, update comments ("offered by default; --no-typesafe opts out")
- [x] 1.3 src/index.ts: `--no-typesafe` on init, update, claude setup; no flag stays undefined
- [x] 1.4 hasTypesafeToken(projectRoot, env): detect the key in `<root>/.env` (env first) via the gate client's resolveTypesafeKey, never logged
- [x] 1.5 reportTypesafe: one gray line when installed + key present; key-missing note names the gate and .env
- [x] 1.6 renderTypesafeRule slimmed to ≤ 90 tokens (marker first, skill, rulebook_gate, TYPESAFE_API_KEY)
- [x] 1.7 src/types.ts integrations.typesafe comment (v7.4: on by default; false = opted out)

## 2. Tail (docs + tests — check or waive with tailWaiver)
- [x] 2.1 Update or create documentation covering the implementation (CLI help text + rule file)
- [x] 2.2 Write tests covering the new behavior
- [x] 2.3 Run tests and confirm they pass
