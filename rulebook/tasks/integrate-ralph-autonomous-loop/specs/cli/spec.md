# Ralph CLI Commands Specification

## ADDED Requirements

### Requirement: Ralph Init Command
The CLI SHALL provide `rulebook ralph init` command to initialize Ralph configuration and generate PRD from current rulebook tasks.

#### Scenario: Initialize Ralph for first time
Given a project has rulebook tasks configured
When `rulebook ralph init` is executed
Then it SHALL create .rulebook-ralph/ directory structure
And it SHALL generate .rulebook-ralph/prd.json from rulebook/tasks/
And it SHALL initialize .rulebook-ralph/progress.txt with header
And it SHALL update .rulebook configuration with ralph.enabled=true
And it SHALL output summary: task count, configuration status
And it SHALL return exit code 0 on success

#### Scenario: Ralph already initialized
Given .rulebook-ralph/prd.json already exists
When `rulebook ralph init` is executed with --force flag
Then it SHALL regenerate prd.json from current tasks
And it SHALL preserve progress.txt and history/
And it SHALL output warning about overwrite
And it SHALL return exit code 0

### Requirement: Ralph Run Command
The CLI SHALL provide `rulebook ralph run` command to execute autonomous iteration loop with configurable max iterations and tool selection.

#### Scenario: Run autonomous loop with default config
Given Ralph is initialized with tasks
When `rulebook ralph run` is executed
Then it SHALL read config from .rulebook for ralph settings (maxIterations, tool, toleranceLevel)
And it SHALL start iteration loop with first incomplete task
And it SHALL display progress: current iteration, task being implemented, status
And it SHALL run quality gates after each iteration (type-check, lint, tests)
And it SHALL commit with iteration metadata after successful implementation
And it SHALL update task status in rulebook/tasks/
And it SHALL continue until all tasks completed or max iterations reached
And it SHALL return exit code 0 if all tasks completed, 1 if max iterations exceeded

#### Scenario: Run with custom flags
Given Ralph is initialized
When `rulebook ralph run --max-iterations 10 --tool amp` is executed
Then it SHALL use Amp CLI instead of default Claude Code
And it SHALL override maxIterations setting to 10
And it SHALL display warnings if flags conflict with .rulebook config
And it SHALL proceed with flag values taking precedence

#### Scenario: Handle user interrupt during loop
Given Ralph loop is executing
When user presses Ctrl+C
Then it SHALL gracefully pause the loop
And it SHALL commit any in-progress changes
And it SHALL save iteration state to enable resume
And it SHALL display "Paused. Resume with: rulebook ralph resume"
And it SHALL return exit code 130 (SIGINT)

### Requirement: Ralph Status Command
The CLI SHALL provide `rulebook ralph status` command to display current loop progress, completed tasks, and iteration metrics.

#### Scenario: Query loop status
Given Ralph has executed some iterations
When `rulebook ralph status` is executed
Then it SHALL display total tasks and completed count
And it SHALL display current iteration number and timestamp
And it SHALL show last attempted task and result (success/failed/blocked)
And it SHALL display quality metrics from last iteration
And it SHALL show progress.txt summary (last 5 learning entries)
And it SHALL indicate if loop is running, paused, or completed

### Requirement: Ralph History Command
The CLI SHALL provide `rulebook ralph history` command to display iteration history, learnings, and comparison across runs.

#### Scenario: View iteration history
Given multiple iterations have completed
When `rulebook ralph history` is executed
Then it SHALL list all iterations chronologically with number, timestamp, task attempted, result
And it SHALL display quality metrics for each iteration
And it SHALL show context loss warnings if detected
And it SHALL allow filtering: --iteration N to show specific iteration
And it SHALL output in table format by default, --json for structured output

#### Scenario: View learnings log
Given progress.txt contains learnings from iterations
When `rulebook ralph history --learnings` is executed
Then it SHALL display progress.txt in append-only order
And it SHALL highlight key patterns and gotchas discovered
And it SHALL show which iteration each learning came from

### Requirement: Ralph Pause Command
The CLI SHALL provide `rulebook ralph pause` command to gracefully interrupt autonomous loop while preserving state.

#### Scenario: Pause running loop
Given Ralph loop is executing
When `rulebook ralph pause` is called
Then it SHALL wait for current iteration to complete
And it SHALL save iteration checkpoint
And it SHALL commit pending changes
And it SHALL mark loop as paused in metadata
And it SHALL return exit code 0 and display resume instructions

### Requirement: Ralph Resume Command
The CLI SHALL provide `rulebook ralph resume` command to continue autonomous loop from previous pause point.

#### Scenario: Resume from pause
Given Ralph was previously paused
When `rulebook ralph resume` is executed
Then it SHALL restore iteration context from checkpoint
And it SHALL load progress.txt and prd.json state
And it SHALL resume from next incomplete task
And it SHALL preserve all previous git history and learnings
And it SHALL continue until completion or next pause
