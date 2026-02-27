# Ralph Core Architecture Specification

## ADDED Requirements

### Requirement: Ralph Manager Orchestrator
The system SHALL provide a RalphManager that orchestrates autonomous iterations through incomplete tasks, executing AI agents with fresh context, validating quality, committing progress, and updating task status.

#### Scenario: Execute autonomous iteration loop
Given a project with rulebook tasks in pending/blocked status
And Ralph is configured with maxIterations=5 and tool=claude
When `ralph run` is executed
Then it SHALL pick the highest-priority incomplete task
And it SHALL execute the AI agent with full PRD context and progress history
And it SHALL capture quality metrics (type-check, lint, tests) after implementation
And it SHALL commit changes with iteration metadata
And it SHALL update task status to completed or in_iteration
And it SHALL repeat until all tasks completed or max iterations reached
And it SHALL return { success: true, completedCount, failedCount, iterations }

#### Scenario: Handle iteration failure
Given an iteration fails type-check or tests
When quality gates fail
Then it SHALL NOT mark task as completed
And it SHALL update task status to blocked with error message
And it SHALL append learning note to progress.txt about failure reason
And it SHALL return { success: false, error, blockingIssue }

### Requirement: PRD Generator
The system SHALL convert rulebook tasks into Ralph-compatible PRD JSON format with task hierarchy, priorities, acceptance criteria, and completion tracking.

#### Scenario: Generate PRD from rulebook tasks
Given rulebook tasks exist with specifications
When `ralph init` is executed
Then it SHALL scan rulebook/tasks/ directory
And it SHALL convert each task to PRD format with fields: id, title, description, priority, status, acceptanceCriteria, estimatedComplexity
And it SHALL create .rulebook-ralph/prd.json with full task hierarchy
And it SHALL initialize progress.txt with header and first iteration marker
And it SHALL return { success: true, taskCount, prdPath }

### Requirement: Iteration Tracker
The system SHALL track iteration history, including which tasks were attempted, results, quality metrics, and learnings captured from agent output.

#### Scenario: Track iteration results
Given an iteration completes
When iteration-tracker logs the result
Then it SHALL store metadata: iterationNumber, timestamp, tasksAttempted, tasksCompleted, failedCount, qualityMetrics
And it SHALL create .rulebook-ralph/history/iteration-N.json with full details
And it SHALL append summary to progress.txt as append-only learning log
And it SHALL track context loss (if agent output is incomplete)
And it SHALL return IterationResult with completionStatus

#### Scenario: Resume from previous iteration
Given an autonomous loop was paused
When `ralph resume` is executed
Then it SHALL read .rulebook-ralph/history/ and progress.txt
And it SHALL restore iteration context and pending tasks
And it SHALL resume from last incomplete task
And it SHALL preserve all previous learnings and git history

### Requirement: Ralph Parser
The system SHALL extract task completion status, learnings, errors, and quality metrics from AI agent output.

#### Scenario: Parse Claude Code completion
Given Claude Code completes a task implementation
When ralph-parser processes the output
Then it SHALL extract task status (completed|failed|partial)
And it SHALL extract learnings and patterns discovered
And it SHALL extract quality check results (type-check pass/fail, test results)
And it SHALL extract git commit messages and changes summary
And it SHALL return ParsedIteration with structured fields for storage

### Requirement: Agent Execution in Ralph Mode
The system SHALL execute AI agents with Ralph-specific configuration: full PRD context, progress history, quality gates, and iteration tracking.

#### Scenario: Execute agent with Ralph context
Given Ralph manager calls agent-manager in Ralph mode
When executing for a specific PRD task
Then it SHALL provide full .rulebook-ralph/prd.json as context
And it SHALL include progress.txt with all previous learnings
And it SHALL include recent git commits (last 20) for pattern recognition
And it SHALL enforce quality gates: type-check, lint, tests before success
And it SHALL pass iteration number and task ID to agent
And it SHALL capture output for ralph-parser extraction

## MODIFIED Requirements

### Requirement: Task Status Schema Extension
The system MUST extend task lifecycle to include in_iteration status for tasks currently being implemented.

#### Scenario: Task transitions during Ralph execution
Given a task starts as pending
When Ralph picks it for implementation
Then it SHALL transition to in_iteration status
And it SHALL update task metadata with iterationNumber and startedAt
And it SHALL transition to completed if quality gates pass
And it SHALL transition to blocked if implementation fails
