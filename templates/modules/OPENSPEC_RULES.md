# OpenSpec Integration Rules

**CRITICAL**: Always check OpenSpec for implementation tasks and update task status on completion.

## OpenSpec Directory Structure

The OpenSpec system uses the `openspec/` directory in the project root:

```
openspec/
├── tasks.json        # All tasks with status and metadata
├── current.json      # Currently active task
├── history.json      # Completed tasks log
├── logs/             # Execution logs
│   └── agent-*.log   # Agent execution logs
├── metrics.json      # Telemetry and performance data
└── snapshots.json    # Git snapshot metadata
```

## Task Management Requirements

### Before Starting Implementation
1. **Check OpenSpec**: Always check `openspec/tasks.json` for pending tasks
2. **Verify Dependencies**: Ensure all task dependencies are completed
3. **Update Status**: Set task status to `in-progress` before starting
4. **Log Activity**: Record task start in logs

### During Implementation
1. **Follow Priority Order**: Execute tasks in priority order (lowest number first)
2. **Respect Dependencies**: Never start a task with incomplete dependencies
3. **Update Progress**: Log significant milestones and progress
4. **Handle Failures**: Mark failed tasks appropriately and log errors

### After Completion
1. **Run Tests**: Ensure 100% test coverage before marking complete
2. **Update Status**: Set task status to `completed`
3. **Move to History**: Completed tasks are moved to `history.json`
4. **Log Completion**: Record task completion with duration
5. **Update Metrics**: Track execution time and success rate

## Task Status Lifecycle

```
pending → in-progress → completed
   ↓           ↓           ↓
skipped    failed    (moved to history)
```

## Quality Gates

### Before Marking Task Complete
- ✅ All tests pass (100% success rate)
- ✅ Coverage meets threshold (95%+)
- ✅ Lint checks pass
- ✅ Code formatting applied
- ✅ Documentation updated
- ✅ Workflows tested

### Task Validation
- ✅ Dependencies satisfied
- ✅ No circular dependencies
- ✅ Estimated time reasonable
- ✅ Clear description provided
- ✅ Proper tags assigned

## Integration Commands

### View Tasks
```bash
rulebook tasks              # List all tasks
rulebook tasks --tree       # Show dependency tree
rulebook tasks --current    # Show current task
```

### Task Management
```bash
rulebook task start <id>    # Start specific task
rulebook task complete <id> # Mark task complete
rulebook task fail <id>     # Mark task failed
```

### Status Updates
```bash
rulebook status             # Show project status
rulebook progress           # Show completion progress
```

## Error Handling

### Task Failures
- Log detailed error information
- Increment attempt counter
- Mark as failed if max attempts reached
- Create rollback snapshot if available
- Notify user of failure

### Dependency Issues
- Detect circular dependencies
- Validate dependency graph
- Prevent out-of-order execution
- Show blocking tasks clearly

## Metrics and Telemetry

### Tracked Metrics
- Task execution time
- Number of attempts
- Success/failure rates
- Coverage trends
- CLI tool performance
- System resource usage

### Reporting
- Weekly progress reports
- Monthly performance summaries
- Coverage trend analysis
- Failure pattern analysis

## Best Practices

1. **Always Check First**: Never start coding without checking OpenSpec
2. **Update Regularly**: Keep task status current throughout development
3. **Log Everything**: Record all significant activities
4. **Test Thoroughly**: Ensure quality gates are met
5. **Document Changes**: Update relevant documentation
6. **Commit Frequently**: Use meaningful commit messages
7. **Monitor Progress**: Use watcher UI for real-time monitoring
