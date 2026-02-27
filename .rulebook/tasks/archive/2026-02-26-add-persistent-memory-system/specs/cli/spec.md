# CLI Memory Commands Specification

## ADDED Requirements

### Requirement: Memory Search CLI Command
The CLI SHALL provide `rulebook memory search <query>` command for searching memories.

#### Scenario: Search memories from CLI
Given the user runs `rulebook memory search "authentication bug"`
When the command executes
Then it SHALL display results in a formatted table with columns: ID (truncated), Type, Title, Score
And it SHALL support `--type <type>` to filter by memory type
And it SHALL support `--limit <n>` to limit results (default 20)
And it SHALL support `--mode <bm25|vector|hybrid>` to select search mode (default hybrid)
And it SHALL use chalk for colored output and ora for progress spinner

### Requirement: Memory Save CLI Command
The CLI SHALL provide `rulebook memory save <text>` command for manual memory storage.

#### Scenario: Save memory from CLI
Given the user runs `rulebook memory save "Decided to use sql.js" --type decision --title "DB Choice" --tags "architecture,database"`
When the command executes
Then it SHALL save the memory with the specified type, title, and tags
And it SHALL display confirmation with the generated memory ID
And it SHALL auto-detect project name from the current directory

### Requirement: Memory List CLI Command
The CLI SHALL provide `rulebook memory list` command for listing recent memories.

#### Scenario: List recent memories
Given the user runs `rulebook memory list --limit 10`
When the command executes
Then it SHALL display the 10 most recent memories sorted by created_at DESC
And it SHALL show: type icon, title, date, and truncated content preview
And it SHALL support `--type <type>` to filter by memory type

### Requirement: Memory Stats CLI Command
The CLI SHALL provide `rulebook memory stats` command for database statistics.

#### Scenario: Display memory statistics
Given the user runs `rulebook memory stats`
When the command executes
Then it SHALL display: total memories, total sessions, database size, max size limit, usage percentage
And it SHALL display a visual progress bar for storage usage
And it SHALL show index health status
And it SHALL warn if usage exceeds 80%

### Requirement: Memory Cleanup CLI Command
The CLI SHALL provide `rulebook memory cleanup` command for forced cache cleanup.

#### Scenario: Force cleanup from CLI
Given the user runs `rulebook memory cleanup --force`
When the command executes
Then it SHALL run the LRU eviction algorithm
And it SHALL display the number of evicted memories and freed bytes
And without `--force` flag it SHALL only clean up if over the size limit

### Requirement: Memory Export CLI Command
The CLI SHALL provide `rulebook memory export` command for exporting memories.

#### Scenario: Export memories to JSON
Given the user runs `rulebook memory export --format json --output memories.json`
When the command executes
Then it SHALL export all memories as a JSON array
And it SHALL write to the specified output file (default: stdout)
And it SHALL support `--format csv` for CSV export
And it SHALL display the number of exported memories

### Requirement: Memory Subcommand Registration
The CLI SHALL register a `memory` subcommand group in the main program.

#### Scenario: Memory command group
Given the user runs `rulebook memory`
When no subcommand is specified
Then it SHALL display available memory subcommands: search, save, list, stats, cleanup, export
And it SHALL display usage examples
