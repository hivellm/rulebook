---
name: "Haskell"
description: "Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow)."
version: "1.0.0"
category: "languages"
author: "Rulebook"
tags: ["languages", "language"]
dependencies: []
conflicts: []
---
<!-- HASKELL:START -->
# Haskell Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence (Stack):
stack build --fast --test --no-run-tests  # Build check
hlint .                    # Linting
ormolu --mode check $(find . -name '*.hs')  # Format check
stack test                 # All tests (100% pass)
stack test --coverage      # Coverage

# Or with Cabal:
cabal build
cabal test
cabal haddock              # Documentation check
```

## Haskell Configuration

**CRITICAL**: Use GHC 9.4+ with strict compiler flags and HLint.

- **Compiler**: GHC 9.4+
- **Build Tool**: Stack or Cabal
- **Linter**: HLint
- **Formatter**: Ormolu or Fourmolu
- **Testing**: Hspec, Tasty, or QuickCheck

### package.yaml (Stack) Requirements

```yaml
name: your-project
version: 0.1.0.0
github: "you/your-project"
license: MIT
author: "Your Name"
maintainer: "you@example.com"

extra-source-files:
- README.md
- CHANGELOG.md

dependencies:
- base >= 4.17 && < 5
- text >= 2.0
- bytestring >= 0.11

ghc-options:
- -Wall
- -Wcompat
- -Widentities
- -Wincomplete-record-updates
- -Wincomplete-uni-patterns
- -Wmissing-export-lists
- -Wmissing-home-modules
- -Wpartial-fields
- -Wredundant-constraints
- -Werror

library:
  source-dirs: src

executables:
  your-project:
    main: Main.hs
    source-dirs: app
    ghc-options:
    - -threaded
    - -rtsopts
    - -with-rtsopts=-N
    dependencies:
    - your-project

tests:
  your-project-test:
    main: Spec.hs
    source-dirs: test
    ghc-options:
    - -threaded
    - -rtsopts
    - -with-rtsopts=-N
    dependencies:
    - your-project
    - hspec
    - QuickCheck
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist - Stack (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow)
fourmolu --mode check $(find src test -name '*.hs')

# 2. Lint (MUST pass with no suggestions - matches workflow)
hlint src test

# 3. Build (MUST pass with no warnings - matches workflow)
stack build --test --no-run-tests --pedantic

# 4. Run all tests (MUST pass 100% - matches workflow)
stack test

# 5. Run QuickCheck properties (matches workflow)
stack test --ta '--quickcheck-tests=1000'

# 6. Check coverage (matches workflow)
stack test --coverage
stack hpc report --all

# Pre-Commit Checklist - Cabal (MUST match .github/workflows/*.yml)

# 1. Format check
fourmolu --mode check $(find src test -name '*.hs')

# 2. Lint
hlint src test

# 3. Build
cabal build all --enable-tests --ghc-options="-Werror"

# 4. Test
cabal test all

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**Why This Matters:**
- Example: Using `fourmolu --mode inplace` locally but `fourmolu --mode check` in CI = failure
- Example: Missing `--pedantic` flag = warnings pass locally but fail in CI

### Example Code

```haskell
{-# LANGUAGE OverloadedStrings #-}

module Data.Processor
  ( DataProcessor(..)
  , process
  , validate
  ) where

import Data.Text (Text)
import qualified Data.Text as T

-- | A data processor with configurable threshold
data DataProcessor = DataProcessor
  { threshold :: Double
  , verbose   :: Bool
  } deriving (Eq, Show)

-- | Process input data
--
-- >>> process (DataProcessor 0.5 False) [1,2,3]
-- [2,3]
process :: DataProcessor -> [Int] -> [Int]
process dp xs = filter (> floor (threshold dp)) xs

-- | Validate input
validate :: Text -> Either String ()
validate input
  | T.null input = Left "Input cannot be empty"
  | otherwise    = Right ()
```

<!-- HASKELL:END -->

