# Design: Simplified Progress-Focused Watcher UI

## Current Layout Problems

### Issues with Current Design
```
┌─────────────────────────────────────┐
│ TASK DETAILS (🔴 Problem: Too much detail)
│ - Full task description
│ - Specifications
│ - Dependencies
│ - Takes too much space
├─────────────────────────────────────┤
│ TASK LIST (🔴 Problem: Scrolling distracts)
│ - Shows all tasks
│ - Scrollable
│ - Completed tasks remain visible
├─────────────────────────────────────┤
│ SYSTEM INFO (🔴 Problem: Not essential)
│ - CPU usage
│ - Memory usage  
│ - Uptime
├─────────────────────────────────────┤
│ ACTIVITY LOGS (🔴 Problem: Not working)
│ - Should show real-time events
│ - Currently broken
└─────────────────────────────────────┘
```

## New Simplified Layout

### Clean Progress-Focused Design
```
┌─────────────────────────────────────────────────────┐
│ 🤖 RULEBOOK WATCHER                          [F10]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📋 ACTIVE TASKS                                     │
│                                                     │
│ ⏳ Implement cursor-agent parser                    │
│    Status: In Progress | Duration: 00:02:34        │
│                                                     │
│ ⏸  Write integration tests                          │
│    Status: Pending                                  │
│                                                     │
│ ⏸  Update documentation                             │
│    Status: Pending                                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📊 PROGRESS                                         │
│                                                     │
│ ████████████░░░░░░░░░░░░░░░░░░░░░░ 33% (1/3)      │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📝 ACTIVITY LOGS                                    │
│                                                     │
│ [14:23:45] ✅ Task started: Implement parser        │
│ [14:24:12] 📖 Reading src/agents/cursor-agent.ts   │
│ [14:24:15] 🔧 Creating parser class                │
│ [14:25:03] 📝 Adding event handlers                │
│ [14:26:19] ✅ Tests passing (95% coverage)         │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Component Design

### 1. Active Tasks Section
```typescript
interface ActiveTask {
  id: string;
  title: string;
  status: 'in_progress' | 'pending';
  duration: number; // ms
  startTime?: Date;
}

// Visual indicators
const STATUS_ICONS = {
  in_progress: '⏳',  // Animated spinner
  pending: '⏸ ',      // Paused/waiting
  // completed tasks are REMOVED from list
};
```

**Features:**
- Show max 5 active/pending tasks
- Current task with animated loading spinner
- Display task duration in real-time
- Auto-remove completed tasks

### 2. Progress Bar
```typescript
interface ProgressInfo {
  completed: number;
  total: number;
  percentage: number;
}

// Visual representation
// ████████████░░░░░░░░░░░░░░░░░░░░░░ 33% (1/3)
// ^^ filled    ^^ empty             ^^ percentage ^^ count
```

**Features:**
- Full-width progress bar
- Show percentage + fraction (1/3, 2/3, etc)
- Real-time updates as tasks complete
- Color coding: green (0-50%), yellow (51-75%), cyan (76-100%)

### 3. Activity Logs
```typescript
interface ActivityLogEntry {
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error' | 'tool';
  message: string;
}

// Log format
// [HH:MM:SS] ICON MESSAGE
```

**Features:**
- Show last 10 log entries
- Auto-scroll to bottom on new entries
- Color-coded by type
- Timestamps for all entries
- Icons for visual clarity

**Log Types:**
- ✅ Success (green)
- ℹ️ Info (blue)
- ⚠️ Warning (yellow)
- ❌ Error (red)
- 📖 Tool: read (gray)
- 🔧 Tool: write (cyan)
- ⚡ Tool: bash (magenta)

## Implementation Strategy

### Phase 1: Remove Unnecessary Panels
```typescript
// In src/core/modern-console.ts

// REMOVE:
// - renderTaskDetails()
// - renderSystemInfo()
// - taskListScrollOffset
// - handleTaskListScroll()

// KEEP:
// - renderTaskList() -> rename to renderActiveTasks()
// - renderActivityLogs() -> fix implementation
```

### Phase 2: Implement Progress Bar
```typescript
// Add to src/core/modern-console.ts

private renderProgressBar(): string {
  const { completed, total } = this.getProgressInfo();
  const percentage = Math.round((completed / total) * 100);
  
  const barWidth = this.screen.width - 20; // Account for padding
  const filledWidth = Math.round((percentage / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;
  
  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(emptyWidth);
  
  return `${filled}${empty} ${percentage}% (${completed}/${total})`;
}
```

### Phase 3: Add Loading Indicator
```typescript
// Add animated spinner for current task

private getLoadingFrame(): string {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const frameIndex = Math.floor(Date.now() / 80) % frames.length;
  return frames[frameIndex];
}

private renderActiveTasks(): string {
  return this.tasks
    .filter(t => t.status !== 'completed') // Auto-remove completed
    .slice(0, 5) // Show max 5
    .map(task => {
      const icon = task.status === 'in_progress' 
        ? this.getLoadingFrame() // Animated
        : '⏸ ';                   // Static
      
      const duration = task.status === 'in_progress'
        ? this.formatDuration(Date.now() - task.startTime)
        : '';
        
      return `${icon} ${task.title}${duration}`;
    })
    .join('\n');
}
```

### Phase 4: Fix Activity Logs
```typescript
// Add proper event handlers

public logActivity(type: LogType, message: string): void {
  const timestamp = new Date();
  const entry: ActivityLogEntry = { timestamp, type, message };
  
  this.activityLogs.push(entry);
  
  // Keep only last 100 entries (show last 10)
  if (this.activityLogs.length > 100) {
    this.activityLogs = this.activityLogs.slice(-100);
  }
  
  this.render(); // Update UI
}

private renderActivityLogs(): string {
  return this.activityLogs
    .slice(-10) // Last 10 entries
    .map(entry => {
      const time = entry.timestamp.toLocaleTimeString('en-US', { hour12: false });
      const icon = LOG_ICONS[entry.type];
      return `[${time}] ${icon} ${entry.message}`;
    })
    .join('\n');
}
```

### Phase 5: Auto-Remove Completed Tasks
```typescript
// When task completes

public markTaskCompleted(taskId: string): void {
  const task = this.tasks.find(t => t.id === taskId);
  if (!task) return;
  
  // Log completion
  this.logActivity('success', `Task completed: ${task.title}`);
  
  // Remove from list
  this.tasks = this.tasks.filter(t => t.id !== taskId);
  
  // Update progress
  this.completedCount++;
  
  this.render();
}
```

## Layout Dimensions

```typescript
interface LayoutConfig {
  // Screen split (total 100%)
  activeTasks: {
    height: '25%',      // ~6 lines for 5 tasks
    minHeight: 6,
    maxHeight: 10,
  },
  progressBar: {
    height: '10%',      // ~3 lines (label + bar + spacing)
    fixed: 3,
  },
  activityLogs: {
    height: '65%',      // Remaining space for logs
    minHeight: 10,
    scrollable: true,   // Auto-scroll to bottom
  },
}
```

## Keyboard Controls

Simplified controls:
- **F10 / Ctrl+C**: Exit watcher
- **No scroll keys**: Focus is on progress, not navigation
- **Auto-refresh**: Every 100ms for smooth animations

## Color Scheme

```typescript
const COLORS = {
  // Status colors
  inProgress: chalk.cyan,
  pending: chalk.gray,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  
  // Progress bar
  progressFilled: chalk.green.bold,
  progressEmpty: chalk.gray.dim,
  progressText: chalk.white.bold,
  
  // Logs
  timestamp: chalk.gray.dim,
  logIcon: chalk.blue,
};
```

## Animation

```typescript
// Loading spinner animation
setInterval(() => {
  if (this.hasInProgressTask()) {
    this.render(); // Update spinner frame
  }
}, 80); // 12.5 fps for smooth animation
```

## Success Criteria

- ✅ UI shows only: Active Tasks + Progress Bar + Activity Logs
- ✅ Current task has animated loading indicator
- ✅ Progress bar updates in real-time
- ✅ Completed tasks automatically removed from list
- ✅ Activity logs show real-time events
- ✅ No scrolling needed for tasks (max 5 visible)
- ✅ Clean, focused, easy-to-understand layout
- ✅ Performance: < 10MB memory, smooth 60fps animations

