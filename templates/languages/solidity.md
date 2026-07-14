<!-- SOLIDITY:START -->
# Solidity rules

## Non-negotiables

1. Solidity 0.8.20+ (prefer 0.8.26+); pin the pragma exactly — never floating (`^0.8.0`).
2. Checks-Effects-Interactions everywhere; `nonReentrant` (OpenZeppelin ReentrancyGuard) on any function making external calls. No external call before state update.
3. Never `tx.origin` for authorization; never `block.timestamp` for randomness/critical logic; no `delegatecall` to untrusted contracts; no `selfdestruct` in upgradeables.
4. Slither must pass clean before commit — never ignore its warnings; run Mythril/Echidna before deploy.
5. Coverage ≥90%; emit events for every state change; `require` validation on all inputs.
6. Use OpenZeppelin for standard functionality — don't hand-roll Ownable/AccessControl/ERCs.
7. External audit + testnet deploy + Etherscan verification before mainnet.

## Conventions

- Framework: Hardhat (hardhat-toolbox, solidity-coverage, hardhat-gas-reporter) or Foundry (forge-std).
- Compiler: optimizer enabled (`runs: 200`), `viaIR: true`.
- NatSpec (`@notice`, `@dev`, `@param`) on all public functions.
- Gas: `immutable` for constructor-set constants, pack structs into 32-byte slots, `calldata` for read-only arrays, cache storage reads in loops.
- Lint/format: Solhint + prettier-plugin-solidity or `forge fmt`; run `--check` variants locally to match CI.
- Admin functions behind multi-sig; test the emergency pause path.

## Testing

- Hardhat: Mocha/Chai with `expect(...).to.emit(...).withArgs(...)` and `revertedWith`; Foundry: `vm.prank`/`vm.deal`/`vm.expectRevert` + `makeAddr`.
- Fuzz (`testFuzz_*` with `vm.assume`) and invariant tests; Foundry CI profile: `fuzz = { runs = 10000 }`, `invariant = { runs = 1000 }`.
- Fork-test against mainnet for realistic scenarios.
- Gas regression: `REPORT_GAS=true npx hardhat test` or `forge snapshot --check`.

## Build & tooling

- Hardhat loop: `prettier --check` → `solhint` → `hardhat compile` → `hardhat test` → `hardhat coverage` → `slither .`.
- Foundry loop: `forge fmt --check` → `forge build` → `forge test -vvv` → `forge coverage` → `forge snapshot --check` → `slither .`.
- Reduce Slither noise with `--exclude-optimization --exclude-informational`, never by skipping the run.
<!-- SOLIDITY:END -->
