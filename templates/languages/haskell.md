<!-- HASKELL:START -->
# Haskell rules

## Non-negotiables

- GHC 9.4+; pick Stack or Cabal per repo and stay consistent — do not mix invocation styles in scripts/CI.
- Warnings are errors: `-Wall -Wcompat -Widentities -Wincomplete-record-updates -Wincomplete-uni-patterns -Wmissing-export-lists -Wpartial-fields -Wredundant-constraints -Werror` in `ghc-options` (Stack: `--pedantic`; Cabal: `--ghc-options="-Werror"`).
- `hlint src test` must pass with zero suggestions.
- Format with Ormolu/Fourmolu; CI uses `--mode check`, so run check mode locally too — `--mode inplace` locally with check in CI still fails on unformatted files.
- Local commands MUST match `.github/workflows/*.yml` exactly.
- Diagnostic-first: `stack build --fast --test --no-run-tests` (or `cabal build all --enable-tests`) before running tests.

## Conventions

- Explicit export lists on every module (`-Wmissing-export-lists` enforces it).
- Total pattern matches — `-Wincomplete-uni-patterns` will catch lambdas/`let` binds too.
- `Either`/`Maybe`/custom error ADTs for failure; no partial functions (`head`, `fromJust`) in library code.
- `Data.Text` over `String` for user-facing text; qualified imports (`import qualified Data.Text as T`).
- Haddock comments (`-- |`) with doctest-style examples (`-- >>>`) on public functions.
- Executables get `-threaded -rtsopts -with-rtsopts=-N`.

## Testing

- Hspec or Tasty for specs, QuickCheck for properties; entry point `test/Spec.hs`.
- Crank properties in CI: `stack test --ta '--quickcheck-tests=1000'`.
- Coverage via `stack test --coverage` + `stack hpc report --all`.

## Build & tooling

- Stack projects: dependencies and ghc-options in `package.yaml` (hpack), not hand-edited `.cabal`.
- Base bound `base >= 4.17 && < 5`; give every dependency a lower bound.
- `cabal haddock` (or `stack haddock`) must succeed — broken doc builds block release.
<!-- HASKELL:END -->
