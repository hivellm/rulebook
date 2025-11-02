<!-- LISP:START -->
# Common Lisp Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
sbcl --eval '(ql:quickload :sblint)' --eval '(sblint:run-lint "src/")'  # Linting
sbcl --load tests/run-tests.lisp  # All tests
sbcl --eval '(asdf:make :your-system)'  # Build with ASDF
```

## Common Lisp Configuration

**CRITICAL**: Use SBCL 2.3+ or CCL with ASDF3 and modern tooling.

- **Implementation**: SBCL 2.3+ (recommended) or CCL
- **Build System**: ASDF3
- **Testing**: FiveAM or Prove
- **Linter**: sblint

### System Definition (your-system.asd)

```lisp
(defsystem "your-system"
  :description "Your system description"
  :version "0.1.0"
  :author "Your Name <you@example.com>"
  :license "MIT"
  :depends-on (:alexandria
               :cl-ppcre
               :str)
  :components ((:module "src"
                :components
                ((:file "package")
                 (:file "main" :depends-on ("package")))))
  :in-order-to ((test-op (test-op "your-system/tests"))))

(defsystem "your-system/tests"
  :depends-on ("your-system"
               "fiveam")
  :components ((:module "tests"
                :components
                ((:file "package")
                 (:file "main-tests" :depends-on ("package")))))
  :perform (test-op (o c) (symbol-call :fiveam :run! :your-system-tests)))
```

## Code Quality Standards

### Mandatory Quality Checks

**IMPORTANT**: These commands MUST match your GitHub Actions workflows!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Lint (matches workflow)
sblint your-system.asd

# 2. Load system (check for errors - matches workflow)
sbcl --non-interactive --load your-system.asd \
     --eval '(ql:quickload :your-system)' \
     --eval '(quit)'

# 3. Run tests (matches workflow)
sbcl --non-interactive \
     --eval '(ql:quickload :your-system/tests)' \
     --eval '(asdf:test-system :your-system)' \
     --eval '(quit)'

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

### Testing Example (FiveAM)

```lisp
(in-package :your-system/tests)

(def-suite your-system-tests
  :description "Main test suite")

(in-suite your-system-tests)

(test process-data-test
  "Test data processing"
  (is (equal '(2 4 6) (process-data '(1 2 3))))
  (is (null (process-data '())))
  (signals error (process-data nil)))

(test validate-input-test
  "Test input validation"
  (is-true (validate-input "test"))
  (is-false (validate-input "")))
```

<!-- LISP:END -->

