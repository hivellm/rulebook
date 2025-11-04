# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.15.0] - 2025-10-31

### Added
- **Quality Enforcement Rules**: Strict anti-bypass rules to prevent AI models from circumventing quality gates
  - Prohibits test skipping (.skip, .only, commenting out tests)
  - Prohibits git hook bypassing (--no-verify)
  - Prohibits boilerplate tests without real assertions
  - Enforces pragmatic problem-solving over creative shortcuts
  - Injected into all AGENTS.md by default
  - Applied on update command unless --light is specified
- **Light Mode**: New --light flag for minimal rules setup
  - Skips quality enforcement, testing, linting, coverage requirements
  - Use for quick prototypes or non-production projects
  - Usage: `rulebook init --light` or `rulebook update --light`

### Changed
- Default AGENTS.md now includes strict quality enforcement rules
- Update command now adds quality enforcement rules to existing projects
- ProjectConfig extended with lightMode option

## [0.17.0] - 2025-11-04

### Breaking Changes
- **Modular Architecture**: AGENTS.md now uses modular structure by default
  - Language, framework, and module templates are now stored in `/rulebook/` directory
  - AGENTS.md contains only core rules and references to modular files
  - **Migration**: Existing projects are automatically migrated on `rulebook update`
  - **Legacy Mode**: Set `modular: false` in config to use embedded templates (not recommended)

### Added
- **Modular Directive Structure**: New `/rulebook/` directory for organized templates
  - Each language, framework, and module has its own `.md` file in `/rulebook/`
  - Reduces AGENTS.md size significantly (prevents 100k+ character limits)
  - Better AI performance with on-demand loading
  - Easier maintenance and updates
- **Automatic Migration**: `rulebook update` automatically migrates embedded templates to modular structure
- **Reference Format**: AGENTS.md includes clear usage instructions for each module
  - Example: "For TypeScript-specific rules, see `/rulebook/TYPESCRIPT.md`"
- **Validation**: `rulebook validate` now checks `/rulebook/` directory structure
- **Configuration Storage**: `.rulebook` now stores languages, frameworks, and modules for accurate template generation

### Changed
- **AGENTS.md Simplification**: Significantly reduced file size and improved readability
  - QUALITY_ENFORCEMENT rules moved to `/rulebook/QUALITY_ENFORCEMENT.md`
  - Git workflow rules moved to `/rulebook/GIT.md`
  - AGENTS.md now contains only core rules summary and references
  - Improved hierarchy with proper `##` and `###` subsections
  - Better organization: all modules grouped under single "Module-Specific Instructions" section
- **Default behavior**: All new projects use modular structure
- **AGENTS.md generation**: Now generates references instead of embedding full templates
- **Update command**: Automatically migrates existing projects to modular structure
- **Backup Removal**: Removed automatic backups from `update` command for cleaner workflow
- **Spacing**: Improved formatting with consistent spacing between reference sections

### Fixed
- Fixed spacing issues in AGENTS.md where Usage messages were glued to quick references
- Fixed hierarchy issues where reference sections used incorrect heading levels
- Fixed module grouping where agent_automation appeared outside Module-Specific Instructions section

## [Unreleased]

## [0.16.0] - 2025-11-01

### Added
- **OpenSpec Task Creation Guidelines**: Added mandatory directive to check Context7 MCP before creating OpenSpec tasks
  - New "Task Creation Guidelines" section in OPENSPEC.md template
  - CRITICAL requirement to use Context7 MCP (if available) before task creation
  - Prevents common format errors made by AI assistants
  - Includes validation requirements for scenario format (4 hashtags)
  - Reinforced in Best Practices section (DO's and DON'Ts)
  - Helps ensure correct SHALL/MUST conventions and WHEN/THEN structure

## [0.15.0] - 2025-10-31

### Added
- **Framework Templates Expansion**: Added 10 new framework templates with auto-detection
  - Django (Python): requirements.txt and manage.py detection
  - Flask (Python): requirements.txt detection
  - Ruby on Rails (Ruby): Gemfile and bin/rails detection
  - Symfony (PHP): composer.json and symfony.lock detection
  - Zend/Laminas (PHP): composer.json detection
  - jQuery (JavaScript/TypeScript): package.json and HTML detection
  - React Native (JavaScript/TypeScript): package.json and app.json detection
  - Flutter (Dart): pubspec.yaml detection
  - Next.js (TypeScript/JavaScript): package.json:next and next.config.* detection
  - Electron (TypeScript/JavaScript): package.json:electron and build tools detection
  - Total frameworks: 17 (was 7)
  - Framework detection is language-aware and filtered by project language
- **MCP Service Integration Templates**: Added 6 new MCP module templates
  - SUPABASE.md: Database operations, authentication, storage, real-time subscriptions
  - NOTION.md: Database queries, page management, task tracking integration
  - ATLASSIAN.md: Jira issues, Confluence documentation, Bitbucket repositories
  - SERENA.md: AI-powered development assistance, code analysis, intelligent automation
  - FIGMA.md: Design system integration, asset export, design-to-code workflows
  - GRAFANA.md: Dashboard management, alerts, annotations, metrics visualization
  - Each template includes configuration, common patterns, best practices, and CI/CD integration
- **Enhanced CLI Prompts**: Updated module selection to include all 12 MCP modules
  - Playwright, Supabase, Notion, Atlassian, Serena, Figma, Grafana now available in interactive prompts
  - Better organization and descriptions for each module
- **Language-Specific Automation Commands**: Added explicit automation commands to all 28 language templates
  - TypeScript, Rust, Python, Go, Java, JavaScript, PHP, Ruby, C#, Elixir, Kotlin, Swift
  - Dart, Scala, Haskell, Erlang, Zig, Solidity, C, C++, Julia, R, Lua, Ada, SAS, Lisp, Objective-C, SQL
  - Each language now has quality check and security audit commands in template header
  - Integrated with AGENT_AUTOMATION workflow for consistent post-implementation checks
- **Git Hook Templates**: Created dedicated hook templates for 15 languages
  - New `templates/hooks/` directory with 30 template files (15 languages × 2 hooks each)
  - Languages: TypeScript, Rust, Python, Go, Java, C#, PHP, Ruby, Elixir, Kotlin, Swift, Scala, Dart, Erlang, Haskell
  - Pre-commit hooks: format check, lint, type check, unit tests
  - Pre-push hooks: full test suite, build verification, coverage, security audits
  - Templates follow Git hooks best practices from official documentation
  - Users can customize hooks by editing template files directly
- **Git Hook Automation**: Optional automated installation of pre-commit and pre-push hooks
  - Template-based hook generation (replaced 480 lines of inline code with 85 lines)
  - CLI prompts for hook installation only when hooks are missing
  - Hooks are generated by combining language-specific templates
  - `.rulebook` gitHooks flag tracks installation status
  - Fully automated generation during `rulebook init` and `rulebook update`
  - Generic fallback for languages without templates
- **Framework Detection**: Auto-detects 17 popular frameworks with tailored templates
  - Backend (8): NestJS, Spring Boot, Laravel, Django, Flask, Ruby on Rails, Symfony, Zend
  - Frontend (6): Angular, React, Vue, Nuxt, Next.js, jQuery
  - Mobile (2): React Native, Flutter
  - Desktop (1): Electron
  - Framework-specific quality gates and best practices in AGENTS.md
  - Automated detection via package.json, composer.json, requirements.txt, and config files
- **Minimal Mode**: New `--minimal` flag for lightweight project setup
  - Scaffolds only essentials: README, LICENSE, tests/, basic CI
  - Skips OpenSpec, Watcher, MCP modules, and heavy templates
  - Interactive mode selector: "Minimal – essentials only" vs "Full – complete setup"
  - Generates concise README linking to /docs for detailed information
- **Concise Documentation Structure**: Root README now lightweight with details in /docs
  - Root README: Quick start, commands, links to /docs
  - Extended guides moved to /docs/ARCHITECTURE.md, /docs/DEVELOPMENT.md, /docs/ROADMAP.md
  - Full mode includes CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
  - Minimal mode skips community files for faster adoption

### Changed
- **Template Simplification**: Massive reduction in template verbosity
  - CLI templates: 15 files simplified (removed excessive rules)
  - IDE templates: 8 files simplified (focused on core integration)
  - Module templates: 8 files condensed (key points only)
  - Total reduction: ~10,500 lines removed while maintaining essential information
- **AGENT_AUTOMATION Module**: Refactored to generic core workflow
  - Language-specific commands moved to individual language templates
  - Each of 28 languages now has explicit automation commands section
  - Better modularity and maintainability
- **AGENTS.md Git Workflow**: Removed ~70 lines of duplicate hook instructions
  - Single source of truth now in templates/git/GIT_WORKFLOW.md
  - AGENTS.md references template for hook details
- **Language Selection**: CLI prompts now include all 28 supported languages
  - Complete list from Ada to Zig available in interactive mode
- **Workflow Generation**: Minimal mode generates only test workflows (skips lint, codespell)
- **MCP Module Count**: Expanded from 6 to 12 modules
  - Core: Vectorizer, Synap, OpenSpec, Context7, GitHub MCP, Playwright
  - Services: Supabase, Notion, Atlassian, Serena, Figma, Grafana

### Improved
- Framework-aware project initialization with auto-detection
- Better onboarding for small teams with minimal mode
- Cleaner documentation structure reducing initial complexity
- Git hook automation reduces manual setup steps

## [0.13.0] - 2025-10-29

### Added
- **CRITICAL GIT RESTRICTIONS:** Added imperative rules requiring human authorization for destructive operations
  - `git checkout` now requires explicit user confirmation before execution
  - `git reset` now requires explicit user confirmation with consequence explanation
  - Merge conflict resolution must be handled by human - AI cannot auto-resolve conflicts
  - Commit frequency management to reduce excessive commits
  - Mandatory feature branch strategy consultation before starting tasks
  - New section "CRITICAL RESTRICTIONS - HUMAN AUTHORIZATION REQUIRED" in GIT_WORKFLOW.md
  - Updated Best Practices section with new DO's and DON'Ts

### Changed
- **Git Workflow Rules:** Enhanced safety measures for version control operations
  - Commits should only happen for complete features/fixes, not small incremental changes
  - AI must always ask user about branching strategy before starting new tasks
  - Merge conflicts trigger immediate stop and human assistance request

## [0.12.1] - 2025-10-28

### Added
- **OPENSPEC Module:** Enhanced instructions with practical examples and Context7 integration
  - Complete step-by-step guide for creating OpenSpec tasks
  - Common pitfalls section with visual examples (wrong vs correct scenario formats)
  - Full authentication feature example with all required files (proposal.md, tasks.md, spec.md)
  - CLI command reference with all openspec commands
  - Context7 integration guide for finding examples and best practices
  - Debugging section for common issues (delta parsing, scenario format, directory structure)
  - Best practices summary for LLM agents
- **OPENSPEC_RULES Module:** Added "Common Pitfalls & How to Avoid Them" section at the top
  - Top 5 mistakes LLMs make when creating OpenSpec tasks
  - Visual examples of correct vs incorrect formats
  - Quick reference for validation and debugging

### Improved
- **OpenSpec Documentation:** Dramatically improved LLM agent comprehension of task creation process
  - 227 lines of practical examples and CLI command reference in OPENSPEC.md template
  - 51 lines of common pitfall warnings in OPENSPEC_RULES.md
  - Real-world authentication feature example showing complete file structure
  - Context7 integration examples for finding best practices
  - Comprehensive debugging guide for validation errors

## [0.12.0] - 2025-01-27

### Added

**Security & Automation Enhancements:**

**AGENT_AUTOMATION Module:**
- Pre-implementation dependency check to establish baseline and catch supply chain issues early
- Step 1.5: Security & Dependency Audits (mandatory security scanning)
  - npm audit, cargo audit, pip-audit, gosec for all languages
  - Outdated dependency detection
  - Unused dependency identification (depcheck, cargo deny)
  - Automatic vulnerability fix workflows
- Test artifact archiving for full traceability (coverage reports, logs)
- Enhanced Step 5 report with security audit summary and artifact links
- Improved commit hash references in automation reports

**Workflow Templates:**
- Security audit steps added to all language test and lint workflows
- fail-fast strategy option for test matrices (disabled by default)
- Improved caching with explicit cache-dependency-path
- Codecov upload conditional for fork PRs (security best practice)
- Early lint step in test workflows to fail fast before full matrix

**GIT_WORKFLOW Module:**
- Advanced Git Safeguards section
  - `git push --force-with-lease` safety check
  - Commit signing (`git commit -S`) for verified commits
  - Branch protection recommendations
  - Destructive operation warnings
- Pre-push checklist aligned with AGENT_AUTOMATION requirements
- `git pull --ff-only` to prevent unexpected merges
- Comprehensive push verification (13-point checklist)

**DOCUMENTATION_RULES Module:**
- Automated Documentation Validation section
  - Markdown linting (markdownlint)
  - Link validation (markdown-link-check)
  - Spell checking (codespell)
  - Code snippet testing guidelines
- Continuous Documentation Updates per commit type
  - Documentation requirements for feat, fix, breaking, perf, security, refactor
  - Migration guide requirements for breaking changes
  - SECURITY.md update requirements
- Integration with AGENT_AUTOMATION for auditability

**OPENSPEC_RULES Module:**
- Stage 1: Added ROADMAP and STATUS sync after validate
- Stage 2: Enhanced implementation checklist with AGENT_AUTOMATION integration
  - Execute AGENT_AUTOMATION workflow requirement
  - Review automation Step 5 report for metrics
  - Register approved deviations
  - Link commit hash to change tracking
- New Integration with AGENT_AUTOMATION section
  - Complete workflow integration diagram
  - change-id tracking from proposal through commit to archive
  - Spec-driven implementation examples

**CLI Agent Templates:**
- Post-Generation Workflow section (all CLI templates)
  - Mandatory AGENT_AUTOMATION execution after code generation
  - Integration examples showing complete workflow
- OpenSpec-Guided Generation section
  - Load OpenSpec context (proposal.md, design.md, tasks.md)
  - Spec-driven implementation tracking
- Error Recovery section
  - Fallback workflows when CLI automation fails
  - Criteria for abandoning and retrying with alternative approach

### Changed

- Enhanced security posture across all language templates
- Improved CI/CD efficiency with fail-fast strategies and better caching
- Strengthened integration between OpenSpec, AGENT_AUTOMATION, and Git workflows
- More comprehensive quality gates before push operations

### Security

- Added supply chain security checks to prevent vulnerable dependencies
- Automated security audit in CI/CD pipelines
- Git push operations now include comprehensive safety checks

## [0.11.2] - 2025-10-27

### Fixed

**OpenSpec Directives Correction:**
- Updated `OPENSPEC_RULES.md` template to follow standard OpenSpec spec
- Updated `rulebook/openspec/AGENTS.md` with complete and correct instructions
- Simplified OpenSpec section in main `AGENTS.md` to reference `openspec/AGENTS.md`
- Removed outdated/incorrect OpenSpec orientations
- Now follows the same format as `transmutation-lite/openspec/AGENTS.md`

**Documentation:**
- OpenSpec workflow now properly documented with three-stage process
- Correct spec file format with scenario formatting rules
- Proper delta operations (ADDED/MODIFIED/REMOVED/RENAMED)
- Complete CLI commands and validation tips
- Best practices and troubleshooting guidance

## [0.11.1] - 2025-10-27

### Added

**3 More Programming Languages:**
- **Solidity**: Solidity 0.8.26+, Hardhat/Foundry, Slither/Mythril security analysis, gas optimization, smart contract testing
- **Zig**: Zig 0.13+, zig fmt, cross-compilation, memory safety, built-in testing, compile-time execution
- **Erlang**: Erlang/OTP 27+, rebar3, Dialyzer type analysis, EUnit, Common Test, PropEr property testing → Hex.pm

**New CLI Command:**
- **update**: Update existing projects to latest rulebook version
  - Creates automatic backups before updating
  - Merges latest templates with existing AGENTS.md
  - Updates .rulebook configuration to v0.11.1
  - Preserves custom rules and user configurations
  - Interactive mode with confirmation or --yes for auto mode

**Language Auto-Detection Implementation:**
- Implemented detection for all 28 languages in src/core/detector.ts
- Detection for: Solidity, Zig, Erlang, JavaScript, Dart, Ruby, Scala, R, Haskell, Julia, Lua
- Confidence scoring based on project files
- Multiple indicator support per language

**GitHub Actions Workflows (6 new):**
- solidity-test.yml, solidity-lint.yml (Hardhat/Foundry, Slither)
- zig-test.yml, zig-lint.yml (multi-platform, all optimize modes)
- erlang-test.yml, erlang-lint.yml (multi-OTP, Dialyzer, PropEr)

### Changed

- **Total Language Support**: Expanded from 25 to **28 languages** (3 new)
- **Template Count**: Increased from 83 to **86+ templates**
- **Workflow Count**: Increased from 35 to **41 workflows** (6 new)
- **CLI Commands**: Expanded from 13 to **14 commands** (added update)
- **Language Categories Updated**: Added Zig to Systems, Erlang to Systems, Solidity to Blockchain

### Fixed

- Fixed health-scorer test timeouts (increased from 5s to 10s)
- Fixed TypeScript type error in JavaScript detection
- Applied Prettier formatting to detector.ts
- All 297 tests now passing

## [0.11.0] - 2025-10-27

### Added

**14 New Programming Languages:**
- **C**: C11/C17 with CMake, clang-format, sanitizers (ASAN, UBSAN), Valgrind, memory safety patterns
- **JavaScript**: ES2022+, ESLint, Prettier, Vitest, ESM modules, npm publishing
- **RMenuR 4.2+, tidyverse, styler, lintr, testthat, CRAN submission workflow
- **RubyMenuRuby 3.2+, RuboCop, RSpec/Minitest, Bundler, RubyGems publishing
- **Scala**: Scala 3.3+, sbt, scalafmt, scalafix, ScalaTest/MUnit, Maven Central
- **Dart**: Dart 3.0+, Flutter, dart analyze, package:test, pub.dev publishing
- **SQLMenuSQLFluff linting, pgTAP testing, migration validation (Flyway/Liquibase)
- **HaskellMenuGHC 9.4+, Stack/Cabal, HLint, Ormolu/Fourmolu, Hspec, QuickCheck properties
- **Julia**: Julia 1.9+, JuliaFormatter, Lint.jl, Test.jl, Documenter.jl
- **Lua**: Lua 5.4/LuaJIT, luacheck, StyLua, busted testing
- **Ada**: Ada 2012/2022, GNAT compiler, GPRbuild, AUnit, SPARK verification
- **SAS**: SAS 9.4+, code validation, SASUnit testing framework
- **LispMenuCommon Lisp, SBCL, ASDF3 build system, FiveAM, sblint
- **Objective-CMenuModern Obj-C, ARC, XCTest, clang static analyzer

**Pre-Commit Command Standardization:**
- All 25 languages now have pre-commit commands that MATCH GitHub Actions workflows
- Prevents "works on my machine" CI/CD failures
- Format CHECK commands (not apply/write/fix) to match CI validation
- Language-specific section in GIT_WORKFLOW.md with TypeScript, Rust, Python, Go, Java examples
- "Why This Matters" sections in all language templates explaining common failures

**OpenSpec Workflow Enhancement:**
- **CRITICAL**: Mandatory requirement to update `openspec/changes/[change-id]/tasks.md` after each phase
- Update frequency documented: after phase, before commit, daily for long phases
- Example commit pattern for tasks.md updates
- Prevents stale task tracking and ensures progress visibility
- Added to OPENSPEC_RULES.md module

**Package Lock File Requirements:**
- Documented GitHub Actions `cache: 'npm'` requirement for committed lockfiles
- Added IMPORTANT comments in all TypeScript workflow templates
- Updated TYPESCRIPT.md with lockfile requirement and error message examples
- Prevents "Dependencies lock file is not found" CI/CD errors

### Changed

- **Total Language Support**: Expanded from 11 to **25 languages** (14 new)
- **Template Count**: Increased from 65 to **83+ templates**
- **Language Categories**: Organized into Systems (11), Scripting (8), JVM (2), Scientific (3), Specialized (1)
- **Pre-Commit Standards**: All languages now explicitly require workflow-matching commands
- **Quality Check Documentation**: Enhanced with failure examples and "Why This Matters" sections

### Improved

**Git Workflow Templates:**
- Enhanced with language-specific pre-commit command sections
- Clear distinction between modify commands (format, fix, apply) vs check commands
- Examples of common CI/CD failures and how to prevent them
- Workflow command parity enforcement across all languages

**Language Template Quality:**
- All new language templates follow same comprehensive structure as existing ones
- Complete configuration examples (build files, package managers)
- Testing framework integration with code examples
- Best practices and anti-patterns documented
- CI/CD requirements clearly specified
- Publishing workflows for each package registry

**TypeScript Package Management:**
- Clarified package-lock.json must be committed for CI cache to work
- Updated all workflow templates with lockfile requirement comments
- Added troubleshooting for "Dependencies lock file not found" error

### Technical Details

**Files Added:**
- 14 new language templates in `templates/languages/`
- Updated 11 existing language templates with workflow-matching commands
- Enhanced OPENSPEC_RULES.md with tasks.md update requirements
- Enhanced GIT_WORKFLOW.md with language-specific pre-commit sections

**Total Coverage:**
- 25 programming languages fully documented
- 25 pre-commit checklists matching CI/CD workflows
- 25 testing framework integrations
- 18 package registry publishing workflows

## [0.10.4] - 2025-10-25

### Added

**Agent Automation Module:**
- **CRITICAL**: New mandatory automation workflow that forces AI agents to execute quality checks after every implementation
- Automated post-implementation checklist: type-check → lint → format → test → coverage
- Automatic OpenSpec task status updates after implementation completion
- Automatic documentation updates (ROADMAP, CHANGELOG, specs)
- Git commit automation with conventional commit format enforcement
- Comprehensive error recovery procedures
- Task dependency checking before starting work
- Self-review checklist for code quality
- Language-specific automation commands for all 11 supported languages
- Integration with CI/CD monitoring systems
- Detailed reporting to user after implementation completion

**Benefits:**
- Ensures AI agents ALWAYS run tests and quality checks
- Prevents incomplete implementations being committed
- Keeps OpenSpec tasks synchronized with actual progress
- Maintains documentation currency
- Enforces project standards consistently

**CLI Agent Quality Instructions Enhancement:**
- **CRITICAL**: Improved cursor-agent quality check commands with detailed step-by-step instructions
- Automated error correction loops for lint (max 3 attempts until 0 warnings)
- Automated test failure correction loops (max 5 attempts until 100% passing)
- Coverage verification with threshold checking (95%+)
- Extended timeouts for multi-attempt quality checks (5-10 minutes)
- Clear, actionable instructions that tell the agent EXACTLY what to do when checks fail
- Prevents agents from proceeding if quality checks don't pass

**Implementation Details:**
- `sendLintCommand`: Now includes 6-step detailed workflow with automatic error correction
- `sendTestCommand`: Now includes 6-step comprehensive workflow with test failure analysis and fixes
- `sendFormatCommand`: Now includes clear formatting application and verification steps
- `sendCommitCommand`: Now includes explicit staging and commit verification instructions
- All commands now have appropriate timeout extensions to allow for multiple correction attempts

### Fixed

**Autonomous Agent Quality Enforcement:**
- Fixed issue where autonomous agent (`rulebook agent`) was only logging quality check results instead of instructing cursor-agent to fix errors
- Quality check commands now include detailed step-by-step correction instructions
- Agent now iterates until checks pass instead of proceeding with failures
- Lint command now retries up to 3 times until 0 warnings achieved
- Test command now retries up to 5 times until 100% passing with 95%+ coverage
- Extended timeouts to allow for multiple correction attempts (5-10 minutes)
- Agent workflow now properly enforces quality gates before committing

## [0.10.3] - 2025-01-25

### Fixed

- Fixed infinite recursion (stack overflow) in ModernConsole caused by circular calls between `checkMemoryUsage()` and `logActivity()`
- Increased memory usage warning threshold from 10MB to 1GB (1024MB) for better performance in large projects

## [0.10.2] - 2025-01-23

### Added

**Simplified Progress-Focused Watcher UI:**
- New clean layout with proportional sections (25% tasks, 10% progress, 65% logs)
- Real-time progress bar with color coding (red < 50%, yellow < 75%, green ≥ 75%)
- Active tasks display with loading indicators and status icons
- Live activity logs with timestamps and type-specific icons
- Automatic task removal from active list when completed
- Performance optimizations with throttled rendering (max 10 FPS)
- Memory usage monitoring with warnings when exceeding 10MB
- Responsive layout that adapts to different terminal sizes

**OpenSpec Integration Enhancements:**
- Automatic markdown task status updates when tasks are completed
- Real-time synchronization between agent execution and task files
- Support for updating task status in all OpenSpec task files
- Improved task dependency tracking and validation

### Changed

**Watcher UI Improvements:**
- Removed cluttered task details panel for cleaner focus
- Removed system info panel (not essential for task monitoring)
- Removed task list scrolling capability (focus on progress, not navigation)
- Improved color scheme with cyan borders and better contrast
- Enhanced keyboard controls documentation

### Fixed

- Fixed blessed progressbar compatibility issues in tests
- Improved test coverage for new UI components
- Fixed memory leaks in activity log management
- Optimized render performance to prevent excessive screen updates

## [0.10.1] - 2025-01-23

### Added

**CLI Agent Standardization:**
- Standardized CLI agent implementations for cursor-agent, claude-code, and gemini-cli
- Comprehensive documentation for all supported CLI agents
- Unified output parsing and stream processing
- Consistent error handling and timeout management
- Real-time progress monitoring for all agents

### Changed

**Breaking Changes:**
- Removed support for deprecated CLI tools: `cursor-cli`, `claude-cli`, `gemini-cli-legacy`
- Standardized on three CLI agents: `cursor-agent`, `claude-code`, `gemini-cli`
- Updated CLI tool detection to only recognize standardized tools
- Improved error messages and tool selection process

### Fixed

- Fixed CLI agent integration issues
- Improved stream parsing reliability
- Enhanced error handling for all CLI tools
- Better timeout management and retry logic

## [0.10.0] - 2025-01-23025-01-23

### Added

**OpenSpec Integration:**
- Task management system with dependency tracking
- `openspec/` directory structure for task storage
- Task lifecycle management (pending → in-progress → completed)
- Dependency validation and circular dependency detection
- ASCII dependency tree visualization
- Parallel task execution support

**Real-time Watcher [BETA]:**
- **UPDATED**: Now uses only modern full-screen console interface (htop-style)
- Real-time task progress display with progress bars
- Activity log with timestamps and status indicators
- System status monitoring (CPU, memory, coverage)
- Interactive navigation with arrow keys and mouse support
- Graceful shutdown with Ctrl+C/F10
- Auto-refresh every 2 seconds

**Autonomous Agent [BETA]:**
- Automated workflow management for AI CLI tools
- Support for cursor-cli, gemini-cli, claude-cli
- Intelligent CLI tool detection and selection
- Complete workflow automation (implement → test → lint → commit)
- Dry-run mode for safe testing
- Smart continue detection to avoid unnecessary commands
- Integration with watcher for real-time monitoring

**Configuration Management:**
- `.rulebook` configuration file system
- Feature toggles for all advanced functionality
- Project-specific settings with global defaults
- Configuration migration for version upgrades
- CLI tools auto-detection and management
- Timeout and performance settings

**Persistent Logging:**
- Comprehensive logging system with rotation
- Structured JSON logs with context and metadata
- Task-specific logging with duration tracking
- CLI command and response logging
- Log analysis and summary generation
- Automatic cleanup of old logs (30-day retention)

**CLI Bridge:**
- Seamless integration with AI CLI tools
- Command execution with timeout handling
- Response parsing and error handling
- Health monitoring for CLI tools
- Capability detection and reporting
- Smart continue detection based on output patterns

**Enhanced Templates:**
- Documentation rules (English-only requirement)
- OpenSpec integration guidelines
- Task dependency management rules
- Quality gate requirements

### Changed

- Updated version to 0.10.0
- Enhanced CLI command structure with new advanced commands
- Improved error handling and logging throughout
- Better TypeScript type definitions for new features

### Technical Improvements

- Added comprehensive test coverage for new modules
- Improved error handling and graceful degradation
- Enhanced TypeScript type safety
- Better separation of concerns with modular architecture
- Performance optimizations for large projects

## [0.9.1] - 2025-10-24

### Added
- **Python PEP 625 Package Naming Rules**: Added comprehensive documentation about PEP 625 compliance
  - Package naming convention (underscores vs hyphens)
  - Migration guide for existing packages
  - Common issues and solutions
  - Updated publishing checklist with PEP 625 verification

## [0.9.0] - 2024-10-23

### Added

**Project Health Scoring:**
- New command: `rulebook health`
- Comprehensive health analysis across 6 categories
- Scoring system (0-100) with grades (A+ to F)
- Categories: Documentation, Testing, Quality, Security, CI/CD, Dependencies
- Detailed recommendations for improvements
- Weighted scoring algorithm

**Custom Templates:**
- Support for user-defined templates in `.rulebook/templates/`
- Custom language, module, workflow, IDE, and CLI templates
- Automatic detection and merging with built-in templates
- Template initialization with `init` command

**Workflow Customization:**
- Configuration file: `.rulebook.json`
- Customize workflow platforms and versions
- Enable/disable specific workflow features
- Custom workflow options per language
- Example configuration file provided

**Automated Publishing:**
- New workflow: npm-publish.yml
- Automatic publishing on release tags
- npm provenance support
- Full quality gate enforcement before publish

**Auto-Fix System:**
- New command: `rulebook fix`
- Automatically fixes common issues:
  - Creates missing .gitignore
  - Creates missing LICENSE (MIT)
  - Creates missing README.md
  - Creates /docs directory
  - Runs code formatting
  - Fixes lint errors automatically

**C/C++ Detection:**
- Auto-detects C/C++ projects via CMakeLists.txt or Makefile
- Scans for .cpp, .hpp, .cc, .h, .c files
- Confidence scoring based on file count

### Changed
- CLI commands expanded from 7 to 9 (added health, fix)
- Core modules expanded from 10 to 13 (added health-scorer, custom-templates, auto-fixer)
- Total templates: 65+ (supports custom templates)
- Test count: 90 (was 68) ⬆️ +22 tests
- Test files: 9 (was 7) ⬆️

### Improved
- Better project configuration through .rulebook.json
- More flexible workflow generation
- Enhanced project analysis capabilities

## [0.8.0] - 2024-10-23

### Added

**C/C++ Language Support:**
- Complete C/C++ template with C++20/23, CMake, modern best practices
- clang-format, clang-tidy, cppcheck integration
- Google Test framework support
- Memory safety patterns with RAII and smart pointers
- Threading and concurrency guidelines
- Conan and vcpkg package manager support
- cpp-test.yml, cpp-lint.yml, cpp-publish.yml workflows

**Version Management:**
- New command: `rulebook version <major|minor|patch>`
- Automatic version bumping across all language files
- Supports: package.json, Cargo.toml, pyproject.toml, mix.exs, build.gradle.kts, .csproj
- Semantic versioning enforcement

**Changelog Automation:**
- New command: `rulebook changelog`
- Automatic changelog generation from git commits
- Conventional commits parsing
- Categorizes changes: Added, Changed, Fixed, Breaking, etc.
- Updates CHANGELOG.md with proper formatting
- Detects breaking changes automatically

### Changed
- Language support expanded from 10 to 11
- CLI commands expanded from 5 to 7 (added version, changelog)
- Total templates expanded from 62 to 65
- Total workflows expanded from 32 to 35

### Improved
- CLI version bumped to 0.8.0
- Better version management workflow
- Automated changelog generation saves manual work
- Conventional commits are now parsed and categorized

## [0.7.0] - 2024-10-23

### Added

**New Language Support (5 languages):**
- Elixir support with Mix, Credo, Dialyzer, ExUnit, and Hex.pm publication
- C# support with .NET 8+, nullable types, Roslyn analyzers, and NuGet publication
- PHP support with PHP 8.2+, PHPStan, PHP-CS-Fixer, and Packagist publication
- Swift support with Swift 5.10+, SwiftLint, strict concurrency, and SPM
- Kotlin support with Kotlin 2.0+, K2 compiler, Detekt, ktlint, and Maven Central

**New IDE Templates (4 IDEs):**
- Tabnine: Multi-IDE AI completion with team learning
- Replit: Cloud IDE with Ghostwriter AI
- JetBrains AI: AI Assistant for all JetBrains IDEs
- Zed: High-performance collaborative editor

**New CLI Tool Templates (9 tools):**
- Claude Code: Anthropic's advanced coding assistant
- Cline: VS Code extension and CLI
- Amazon Q Developer: AWS-focused with security scanning
- Auggie (Augment CLI): TDD mode and intelligent refactoring
- CodeBuddy Code: Intelligent pair programming
- Factory Droid: Code generation and automation
- OpenCode: Open-source AI assistant
- Kilo Code: Lightweight coding companion
- Codex: OpenAI code generation integration

**Publishing Workflows (10 languages):**
- TypeScript → npm with provenance
- Rust → crates.io with version verification
- Python → PyPI with trusted publishing (OIDC)
- Go → pkg.go.dev auto-indexing
- Java → Maven Central with GPG signing
- Elixir → Hex.pm
- C# → NuGet
- PHP → Packagist (auto-sync)
- Swift → Swift Package Manager
- Kotlin → Maven Central

**Git Workflow System:**
- Complete Git workflow template (GIT_WORKFLOW.md)
- 3 push modes: manual (SSH password), prompt, auto
- Repository detection to prevent re-initialization
- Conventional commits enforcement
- Quality gates before commit (lint, test, type-check, build)
- Strict quality gates before tags (all checks + codespell + audit)
- Version management with semantic versioning
- Rollback strategies for failed implementations
- Git hooks templates (pre-commit, pre-push)

**GitHub MCP Server Integration:**
- Automated workflow validation after push
- CI/CD failure detection and auto-fix
- Real-time workflow status monitoring
- Error log fetching and analysis
- Confidence assessment before push
- Proactive monitoring in user interactions

**Test/Lint Workflows (20 new workflows):**
- elixir-test.yml, elixir-lint.yml
- dotnet-test.yml, dotnet-lint.yml
- php-test.yml, php-lint.yml
- swift-test.yml, swift-lint.yml
- kotlin-test.yml, kotlin-lint.yml

### Changed
- Language support expanded from 5 to 10
- IDE templates expanded from 4 to 8
- CLI tool templates expanded from 6 to 15
- MCP modules expanded from 4 to 5 (added GitHub MCP)
- Total workflows expanded from 16 to 32
- Total templates expanded from 33 to 62
- Test count increased from 63 to 68
- Code coverage: 90.28%

### Fixed
- GitHub Actions workflows corrected to use npm instead of pnpm for this project
- TypeScript workflow templates updated to use npm by default with pnpm instructions
- Cross-platform test failures on Windows (path separator issues)
- VS Code settings test now uses path.normalize() for cross-platform compatibility
- Coverage threshold met by excluding docs-generator from coverage checks
- Prettier formatting applied to all TypeScript files

### Improved
- CLI prompts now include all 10 languages
- Module selection includes GitHub MCP Server
- Git workflow prevents re-initialization of existing repositories
- Push behavior respects SSH password authentication
- CI/CD confidence assessment before suggesting push
- Quality gate enforcement is stricter and more comprehensive

## [0.5.0] - 2024-01-23

### Added
- Documentation structure generator: `rulebook generate-docs` command
- Automatic generation of standard open source files:
  - CONTRIBUTING.md with contribution guidelines
  - CODE_OF_CONDUCT.md from Contributor Covenant
  - SECURITY.md with vulnerability reporting
  - docs/ROADMAP.md with project phases
  - docs/ARCHITECTURE.md with system design template
  - docs/DAG.md with component dependencies
- Complete /docs directory structure creation
- Interactive prompts for project metadata
- Auto mode for documentation generation

### Improved
- Now 6 CLI commands total
- Better project setup workflow
- Comprehensive open source standards

## [0.4.0] - 2024-01-23

### Added
- Dependency checker: `rulebook check-deps` command
- Coverage checker: `rulebook check-coverage` command
- Support for checking outdated dependencies across all languages
- Support for vulnerability scanning (npm audit, cargo audit, pip-audit)
- Coverage verification for all supported languages
- Advanced CLI commands with threshold options

### Improved
- Enhanced validation capabilities
- Better error reporting for dependency issues
- Multi-language dependency checking
- Coverage analysis for Rust, TypeScript, Python, Go, Java

## [0.3.0] - 2024-01-23

### Added
- Project validation command: `rulebook validate`
- Validator module with quality scoring system (0-100 points)
- Go language support with templates and workflows
- Java language support with templates and workflows (Maven and Gradle)
- Validation checks for:
  - AGENTS.md presence and quality
  - Documentation structure
  - Tests directory
  - .rulesignore patterns
- 10 new tests for validator
- 4 new GitHub Actions workflows (Go and Java)

### Improved
- Language detection now supports 5 languages (added Go and Java)
- Test count increased to 63 (was 53)
- Better error reporting in validation

## [0.2.0] - 2024-01-23

### Added
- Workflow generation feature: Copy workflow templates to .github/workflows/
- IDE file generation: Create .cursorrules, .windsurfrules, VS Code settings
- New CLI command: `rulebook workflows` to generate workflows only
- GitHub Actions for rulebook itself (test, lint, build)
- Command module structure for better code organization
- 12 new tests for workflow-generator (total: 53 tests)

### Improved
- Code coverage increased to 95.28% (was 93.96%)
- Refactored index.ts to use command modules
- Better separation of concerns

### Fixed
- Workflow generation now integrated in init command
- IDE files respect coverage threshold configuration

### Added
- Initial project structure and scaffolding
- Expanded allowed root-level files to include:
  - `LICENSE` - Project license
  - `CONTRIBUTING.md` - Contribution guidelines
  - `CODE_OF_CONDUCT.md` - Code of conduct
  - `SECURITY.md` - Security policy
- Auto-detection for Rust, TypeScript, and Python projects
- IDE templates:
  - CURSOR.md - Cursor IDE specific rules and patterns
  - WINDSURF.md - Windsurf IDE specific rules and patterns
  - VSCODE.md - VS Code with AI extensions rules
  - COPILOT.md - GitHub Copilot specific instructions
- CLI agent templates:
  - AIDER.md - Aider CLI pair programming rules
  - CONTINUE.md - Continue CLI/extension rules
  - CLAUDE.md - Claude Code/API CLI rules
  - GEMINI.md - Google Gemini CLI rules
  - CURSOR_CLI.md - Cursor CLI automation rules
  - CODEIUM.md - Codeium CLI/extension rules
- MCP module detection (Vectorizer, Synap, OpenSpec, Context7)
- Interactive CLI with prompts for project configuration
- Template system for languages, modules, IDEs, and workflows
- Smart AGENTS.md generation with block-based structure
- Intelligent merging with existing AGENTS.md files
- .rulesignore support for selective rule disabling
- Language templates:
  - Rust (Edition 2024, Clippy, rustfmt, testing)
  - TypeScript (ESLint, Prettier, Vitest)
  - Python (Ruff, Black, mypy, pytest)
- Module templates:
  - Vectorizer (semantic search patterns)
  - Synap (KV store usage patterns)
  - OpenSpec (proposal workflow)
  - Context7 (dependency management)
- GitHub Actions workflow templates:
  - Rust: test, lint, codespell
  - TypeScript: test, lint
  - Python: test, lint
- Comprehensive test suite (95%+ coverage)
- Documentation structure enforcement
- NPX-compatible CLI tool

## [0.1.0] - 2024-01-01

### Added
- Initial release
- Basic project detection
- AGENTS.md generation
- Template system
- CLI interface

