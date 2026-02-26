# Ralph MCP Server Specification

## ADDED Requirements

### Requirement: Ralph Init MCP Tool
The MCP server SHALL expose `rulebook_ralph_init` tool to initialize Ralph configuration via Model Context Protocol.

#### Scenario: Initialize Ralph via MCP
Given the MCP server is running with Ralph module loaded
When `rulebook_ralph_init` is called with `{ force: false }`
Then it SHALL create .rulebook-ralph/ directory structure
And it SHALL generate .rulebook-ralph/prd.json from rulebook/tasks/
And it SHALL update .rulebook configuration
And it SHALL return `{ success: true, taskCount, prdPath, initialized: true }`

#### Scenario: Ralph already initialized, force reinit
Given .rulebook-ralph/prd.json already exists
When `rulebook_ralph_init` is called with `{ force: true }`
Then it SHALL regenerate prd.json
And it SHALL preserve progress.txt
And it SHALL return `{ success: true, taskCount, prdPath, reinitialized: true }`

### Requirement: Ralph Run MCP Tool
The MCP server SHALL expose `rulebook_ralph_run` tool to execute autonomous iteration loop via MCP.

#### Scenario: Start autonomous loop via MCP
Given Ralph is initialized
When `rulebook_ralph_run` is called with `{ maxIterations: 5, tool: "claude", dryRun: false }`
Then it SHALL start the iteration loop
And it SHALL return `{ success: true, loopId, iterationNumber, currentTask, status: "running" }`
And it SHALL continue processing in background or in blocking mode depending on client capability
And if loop completes before MCP timeout, it SHALL return final status with completedCount, failedCount

#### Scenario: Dry run mode
Given Ralph is initialized
When `rulebook_ralph_run` is called with `{ maxIterations: 1, tool: "claude", dryRun: true }`
Then it SHALL simulate one iteration without executing agent
And it SHALL return preview of what would happen
And it SHALL return `{ success: true, dryRun: true, tasksToAttempt: [...], preview: "..." }`

### Requirement: Ralph Status MCP Tool
The MCP server SHALL expose `rulebook_ralph_status` tool to query current autonomous loop state and metrics.

#### Scenario: Query loop status
Given Ralph loop has executed iterations
When `rulebook_ralph_status` is called
Then it SHALL return current state: loopId, iterationNumber, currentTask, status (running|paused|completed|failed)
And it SHALL return progress metrics: tasksCompleted, tasksFailed, tasksRemaining
And it SHALL return quality metrics from last iteration
And it SHALL return timestamp of last activity
And it SHALL return `{ success: true, loopStatus: {...}, metrics: {...} }`

#### Scenario: No active loop
Given Ralph loop has not been started or is archived
When `rulebook_ralph_status` is called
Then it SHALL return `{ success: true, status: "not_running", lastRun: {...} }`

### Requirement: Ralph Iteration History MCP Tool
The MCP server SHALL expose `rulebook_ralph_get_iteration_history` tool to retrieve detailed iteration history and learnings.

#### Scenario: Get iteration history
Given iterations have been completed
When `rulebook_ralph_get_iteration_history` is called with `{ limit: 10, offset: 0 }`
Then it SHALL return paginated history from .rulebook-ralph/history/
And each entry SHALL include: iterationNumber, timestamp, taskAttempted, result, qualityMetrics, duration
And it SHALL return `{ success: true, iterations: [...], total, hasMore }`

#### Scenario: Get specific iteration details
Given multiple iterations exist
When `rulebook_ralph_get_iteration_history` is called with `{ iterationNumber: 3 }`
Then it SHALL return full details from .rulebook-ralph/history/iteration-3.json
And it SHALL include agent output, commit hash, learnings captured
And it SHALL return `{ success: true, iteration: {...} }`

#### Scenario: Get learnings summary
Given progress.txt contains learnings
When `rulebook_ralph_get_iteration_history` is called with `{ type: "learnings" }`
Then it SHALL parse progress.txt and extract learning entries
And it SHALL return structured learnings with iteration number and tags
And it SHALL return `{ success: true, learnings: [...] }`
