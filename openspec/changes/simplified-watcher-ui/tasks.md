# Tasks: Simplified Progress-Focused Watcher UI

## Phase 0: Agent Initialization
- [x] **INIT-001**: Add initial task to agent workflow: Update task status on start
  - Implemented: Agent manager calls syncTaskStatus() before starting workflow
  - Location: src/core/agent-manager.ts:87-100
- [x] **INIT-002**: Implement `syncTaskStatus()` method in OpenSpecManager
  - Implemented: Reloads all tasks and logs summary
  - Location: src/core/openspec-manager.ts:114-135
  - Uses onLog callback for watcher integration
- [x] **INIT-003**: Call syncTaskStatus() when agent starts
  - Implemented: Called in startAgent() before workflow loop
  - Location: src/core/agent-manager.ts:94
- [x] **TEST-000**: Test task status sync on agent start
  - Verified: Working in watcher mode with proper logging

## Phase 1: Remove Unnecessary Components
- [ ] **REFACTOR-001**: Remove `renderTaskDetails()` method from modern-console.ts
- [ ] **REFACTOR-002**: Remove `renderSystemInfo()` method from modern-console.ts
- [ ] **REFACTOR-003**: Remove `taskListScrollOffset` property
- [ ] **REFACTOR-004**: Remove `handleTaskListScroll()` method
- [ ] **REFACTOR-005**: Remove scroll key handlers (Up/Down arrows)
- [ ] **TEST-001**: Update tests to reflect removed components

## Phase 2: Implement Progress Bar
- [ ] **IMPLEMENT-001**: Create `getProgressInfo()` method
- [ ] **IMPLEMENT-002**: Create `renderProgressBar()` method with color coding
- [ ] **IMPLEMENT-003**: Add progress percentage calculation
- [ ] **IMPLEMENT-004**: Add task count display (completed/total)
- [ ] **IMPLEMENT-005**: Integrate progress bar in main render loop
- [ ] **TEST-002**: Unit tests for progress bar rendering
- [ ] **TEST-003**: Test progress calculation edge cases (0%, 50%, 100%)

## Phase 3: Add Loading Indicator
- [ ] **IMPLEMENT-006**: Create `getLoadingFrame()` method with spinner animation
- [ ] **IMPLEMENT-007**: Update `renderActiveTasks()` to use loading indicator
- [ ] **IMPLEMENT-008**: Add task duration display for in-progress tasks
- [ ] **IMPLEMENT-009**: Implement smooth spinner animation (12.5 fps)
- [ ] **IMPLEMENT-010**: Add animation refresh interval
- [ ] **TEST-004**: Test loading indicator animation
- [ ] **TEST-005**: Test task duration formatting

## Phase 4: Auto-Remove Completed Tasks
- [ ] **IMPLEMENT-011**: Update `markTaskCompleted()` to remove task from list
- [ ] **IMPLEMENT-012**: Add completion logging before removal
- [ ] **IMPLEMENT-013**: Update completed counter
- [ ] **IMPLEMENT-014**: Filter completed tasks in `renderActiveTasks()`
- [ ] **IMPLEMENT-015**: Limit active tasks display to max 5
- [ ] **TEST-006**: Test task removal on completion
- [ ] **TEST-007**: Test list update after removal
- [ ] **TEST-008**: Test max 5 tasks display limit

## Phase 5: Fix Activity Logs
- [ ] **IMPLEMENT-016**: Create `ActivityLogEntry` interface
- [ ] **IMPLEMENT-017**: Create `logActivity()` method
- [ ] **IMPLEMENT-018**: Implement log type icons (success, info, warning, error, tool)
- [ ] **IMPLEMENT-019**: Add timestamp formatting
- [ ] **IMPLEMENT-020**: Implement log buffer (max 100, show last 10)
- [ ] **IMPLEMENT-021**: Add auto-scroll to bottom
- [ ] **IMPLEMENT-022**: Color-code log entries by type
- [ ] **TEST-009**: Unit tests for log entry creation
- [ ] **TEST-010**: Test log buffer limit (max 100)
- [ ] **TEST-011**: Test log display (last 10)

## Phase 6: Integration with Agent Manager
- [ ] **INTEGRATE-001**: Connect activity logs to CLI bridge events
- [ ] **INTEGRATE-002**: Log tool calls (read, write, bash)
- [ ] **INTEGRATE-003**: Log task start/completion
- [ ] **INTEGRATE-004**: Log errors and warnings
- [ ] **INTEGRATE-005**: Update watcher on task completion
- [ ] **TEST-012**: Integration test with agent manager
- [ ] **TEST-013**: Test real-time log updates

## Phase 7: Layout and Styling
- [ ] **STYLE-001**: Define layout dimensions (25% tasks, 10% progress, 65% logs)
- [ ] **STYLE-002**: Implement responsive height calculations
- [ ] **STYLE-003**: Add proper padding and borders
- [ ] **STYLE-004**: Apply color scheme
- [ ] **STYLE-005**: Test on different terminal sizes (80x24, 120x40, 200x60)
- [ ] **TEST-014**: Visual regression tests

## Phase 8: Performance Optimization
- [ ] **OPTIMIZE-001**: Optimize render loop to only update when needed
- [ ] **OPTIMIZE-002**: Debounce rapid updates
- [ ] **OPTIMIZE-003**: Profile memory usage (target < 10MB)
- [ ] **OPTIMIZE-004**: Optimize animation frame rate
- [ ] **TEST-015**: Performance benchmark tests
- [ ] **TEST-016**: Memory leak tests

## Phase 9: Documentation
- [ ] **DOCS-001**: Update watcher screenshots in README
- [ ] **DOCS-002**: Document new UI layout
- [ ] **DOCS-003**: Update keyboard controls documentation
- [ ] **DOCS-004**: Add troubleshooting guide
- [ ] **DOCS-005**: Update CHANGELOG.md

## Phase 10: Quality Assurance
- [ ] **QA-001**: Manual testing with real tasks
- [ ] **QA-002**: Test loading indicator animation smoothness
- [ ] **QA-003**: Test progress bar accuracy
- [ ] **QA-004**: Test activity logs real-time updates
- [ ] **QA-005**: Test task auto-removal
- [ ] **QA-006**: Test on Windows Terminal
- [ ] **QA-007**: Test on iTerm2 (macOS)
- [ ] **QA-008**: Test on GNOME Terminal (Linux)
- [ ] **QA-009**: Run full test suite (npm test)
- [ ] **QA-010**: Verify 95%+ coverage

## Dependencies
- REFACTOR tasks must complete before IMPLEMENT
- IMPLEMENT Phase 2-5 can run in parallel
- INTEGRATE depends on IMPLEMENT completion
- STYLE depends on all IMPLEMENT phases
- OPTIMIZE depends on complete implementation
- DOCS depends on final implementation
- QA must be last phase

## Estimated Timeline
- Phase 1 (Remove): 2 hours
- Phase 2 (Progress Bar): 3 hours
- Phase 3 (Loading Indicator): 2 hours
- Phase 4 (Auto-Remove): 2 hours
- Phase 5 (Activity Logs): 4 hours
- Phase 6 (Integration): 3 hours
- Phase 7 (Layout): 2 hours
- Phase 8 (Performance): 2 hours
- Phase 9 (Documentation): 2 hours
- Phase 10 (QA): 3 hours
**Total: ~25 hours (~3 days)**

## Priority
**High** - Improves user experience significantly, makes progress tracking clearer

## Blockers
None - All dependencies are internal

