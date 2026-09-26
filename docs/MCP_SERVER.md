# MCP Server API Documentation

## Overview

The Rulebook MCP Server provides programmatic access to task management functions through the Model Context Protocol (MCP). This allows AI models and other MCP-compatible clients to manage Rulebook tasks without executing terminal commands.

## Server Information

- **Name**: `rulebook-task-management`
- **Version**: `1.0.2`
- **Transport**: stdio (standard input/output)
- **Protocol**: MCP (Model Context Protocol)

## Available Functions

### `rulebook_task_create`

Create a new Rulebook task with OpenSpec-compatible format.

**Input Schema:**
```typescript
{
  taskId: string;                    // Task ID in kebab-case (e.g., add-feature-name)
  proposal?: {                        // Optional proposal content
    why: string;                      // Why this change is needed (minimum 20 characters)
    whatChanges: string;              // Description of what will change
    impact?: {                        // Optional impact analysis
      affectedSpecs?: string[];       // List of affected specifications
      affectedCode?: string[];        // List of affected code files/modules
      breakingChange: boolean;        // Whether this is a breaking change
      userBenefit: string;           // User benefit description
    };
  };
}
```

**Output Schema:**
```typescript
{
  success: boolean;                   // Whether task creation succeeded
  taskId: string;                    // Created task ID
  message: string;                    // Success or error message
  path?: string;                      // Path to created task directory
}
```

**Example:**
```json
{
  "taskId": "add-user-authentication",
  "proposal": {
    "why": "Users need secure authentication to access protected resources",
    "whatChanges": "Add JWT-based authentication system with login and registration endpoints",
    "impact": {
      "affectedSpecs": ["auth/spec.md"],
      "affectedCode": ["src/auth/", "src/middleware/"],
      "breakingChange": false,
      "userBenefit": "Secure user authentication and session management"
    }
  }
}
```

---

### `rulebook_task_list`

List all Rulebook tasks with optional filters.

**Input Schema:**
```typescript
{
  includeArchived?: boolean;         // Include archived tasks (default: false)
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';  // Filter by status
}
```

**Output Schema:**
```typescript
{
  tasks: Array<{
    id: string;                       // Task ID
    title: string;                    // Task title
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    createdAt: string;                // ISO 8601 timestamp
    updatedAt: string;                // ISO 8601 timestamp
    archivedAt?: string;              // ISO 8601 timestamp (if archived)
  }>;
  count: number;                      // Total number of tasks
}
```

**Example:**
```json
{
  "includeArchived": false,
  "status": "in-progress"
}
```

**Response:**
```json
{
  "tasks": [
    {
      "id": "add-user-authentication",
      "title": "add-user-authentication",
      "status": "in-progress",
      "createdAt": "2025-11-24T01:52:17.877Z",
      "updatedAt": "2025-11-24T02:15:30.123Z"
    }
  ],
  "count": 1
}
```

---

### `rulebook_task_show`

Show detailed information about a specific task.

**Input Schema:**
```typescript
{
  taskId: string;                     // Task ID to show
}
```

**Output Schema:**
```typescript
{
  task: {
    id: string;
    title: string;
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    proposal?: string;                 // Proposal markdown content
    tasks?: string;                    // Tasks checklist markdown content
    design?: string;                   // Design document markdown content
    specs?: Record<string, string>;    // Module -> spec content mapping
    createdAt: string;
    updatedAt: string;
    archivedAt?: string;
  } | null;
  found: boolean;                     // Whether task was found
}
```

**Example:**
```json
{
  "taskId": "add-user-authentication"
}
```

---

### `rulebook_task_update`

Update task status or progress.

**Input Schema:**
```typescript
{
  taskId: string;                     // Task ID to update
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';  // New status
  progress?: number;                  // Progress percentage (0-100)
}
```

**Output Schema:**
```typescript
{
  success: boolean;                   // Whether update succeeded
  taskId: string;                    // Updated task ID
  message: string;                    // Success or error message
}
```

**Example:**
```json
{
  "taskId": "add-user-authentication",
  "status": "in-progress",
  "progress": 50
}
```

---

### `rulebook_task_validate`

Validate task format against OpenSpec-compatible requirements.

**Input Schema:**
```typescript
{
  taskId: string;                     // Task ID to validate
}
```

**Output Schema:**
```typescript
{
  valid: boolean;                     // Whether task format is valid
  errors: string[];                   // List of validation errors
  warnings: string[];                 // List of validation warnings
}
```

**Example:**
```json
{
  "taskId": "add-user-authentication"
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

---

### `rulebook_task_archive`

Archive a completed task and apply spec deltas.

**Input Schema:**
```typescript
{
  taskId: string;                     // Task ID to archive
  skipValidation?: boolean;           // Skip validation before archiving (default: false)
}
```

**Output Schema:**
```typescript
{
  success: boolean;                   // Whether archiving succeeded
  taskId: string;                    // Archived task ID
  archivePath: string;                // Path to archive location
  message: string;                    // Success or error message
}
```

**Example:**
```json
{
  "taskId": "add-user-authentication",
  "skipValidation": false
}
```

---

## Decision requests (v7.2, `rulebook_task`)

The consolidated v7 `rulebook_task` tool (actions `create|list|show|update|archive|validate|delete`) gains three actions so a task is never left blocked with the question buried in prose:

| Action | Input | Effect |
|--------|-------|--------|
| `ask` | `taskId`, `question`, optional `context`, `options` (`"Label — trade-off"` strings), `recommended`, `blocks` | Stores the question (`q1`, `q2`, …) on the task, marks it `blocked`, returns `operatorPrompt` + `instruction` telling the model to show it to the operator as a form (AskUserQuestion in Claude Code) and stop working on that item |
| `answer` | `taskId`, `questionId`, `answer` | Records the decision; the task returns to `in-progress` once no open question (and no `blockedBy`) remains |
| `questions` | optional `taskId` | Lists open questions with their operator prompts |

Rules enforced by the managers (both the file and GitHub backends):

- `update` with `status:"blocked"` is refused unless the task has an open question or a `blockedBy` dependency — the error names the `ask` action.
- `archive` is refused while a question is open, regardless of `skipValidation` or `tailWaiver`.
- `answer` refuses an empty answer.
- `list`, `show` and `rulebook_session {action:"start"}` carry open questions (`openQuestions` / `awaitingDecision`) so a fresh session sees them before picking up work.

Example:

```json
{ "action": "ask", "taskId": "phase1_add-auth",
  "question": "Which identity provider?",
  "options": ["Auth0 — hosted, fastest", "Keycloak — self-hosted"],
  "recommended": "Auth0", "blocks": "1.2 wire login" }
```

```json
{ "success": true, "taskId": "phase1_add-auth", "taskStatus": "blocked",
  "question": { "id": "q1", "status": "open", "...": "..." },
  "operatorPrompt": "[phase1_add-auth · q1] Decision needed: Which identity provider?\nBlocks: 1.2 wire login\nOptions:\n  1. Auth0 (recommended) — hosted, fastest\n  2. Keycloak — self-hosted\nAnswer with: rulebook_task {action:\"answer\", taskId:\"phase1_add-auth\", questionId:\"q1\", answer:\"...\"}",
  "instruction": "Present operatorPrompt to the operator NOW as an explicit form ..." }
```

On disk (file backend) questions live in the task's `.metadata.json` under `questions`; on the GitHub backend they are a `<!-- rulebook:questions -->` JSON section of the issue body.

## Recurring requests → skills (v7.2, `rulebook_memory` + `rulebook_session`)

A learning captured under the same title again is counted (`occurrences`, `lastSeenAt`) instead of duplicated, and the newest content wins. Learnings seen 2+ times and not yet promoted are **skill candidates**:

| Surface | Field |
|---------|-------|
| `rulebook_session {action:"start"}` | `skillCandidates: [{id, title, occurrences}]` + `skillHint` |
| `rulebook_memory {kind:"learning", action:"list"}` | `skillCandidates` + `hint` |
| `rulebook_memory {kind:"learning", action:"promote", id, target:"skill", content?}` | writes `.claude/skills/<slug>/SKILL.md` (frontmatter `name`/`description`, body scaffolded as *When to use / Steps / Verify*), marks the learning `promotedTo: {type:"skill", id:<slug>}`; refuses to overwrite an existing skill. `content` is the one-line description. |
| `rulebook_skill {action:"list", category:"project"}` | project skills from `.claude/skills/`, id `project/<dir>`, disabled unless listed in config |

CLI equivalents: `rulebook learn promote <id> skill`, `rulebook skills list --category project`.

## Entry gate (v7.4, `rulebook_gate`)

The main session calls `rulebook_gate` first with every operator prompt. Rulebook sends Jev (TypeSafe's System One model) one request: a JSON description of the project plus the prompt, and up to 12 questions — one per decision the session would otherwise guess. The answers come back as a `routing` to act on. The gate is advisory: it never throws and never blocks, and it is called once per operator prompt, never by subagents.

| Input | Meaning |
|-------|---------|
| `prompt` | the operator prompt, verbatim |
| `notes` (optional) | what you want decided |
| `projectId` (optional) | workspace project override |

**What Jev sees** (`stateBytes` reports the size, at most 8 KB): project id/version/languages/agents mode/task backend from `rulebook.json`; a one-line project description (≤ 400 chars, below); the active task and up to 15 tasks (titles ≤ 60 chars); up to 5 open decision requests; up to 5 skill candidates; up to 20 installed skills (enabled ids plus `.claude/skills/<dir>`); the eight subagent types; the model routing table; the prompt (≤ 4096 chars, then `[…truncated by rulebook]`) and notes (≤ 1024). Over 6.5 KB, rulebook drops notes, then trims skills to 10, tasks to 8, skill candidates, open questions to 2, the project description to 200 chars, and the prompt to 2048 chars, in that order.

**Questions**: `kind`, `needs_task`, `existing_task` (omitted when there are no tasks), `model`, `agent`, `skill` (omitted when no skills are installed), `parallel`, `needs_operator_decision`, `in_project_scope` (omitted when there is no project description), `risk_destructive_git`, `risk_os_scheduling`, `risk_secrets`.

**Project scope**: `in_project_scope` asks whether the prompt is about the project in `project.description` (its code, docs, tooling, tasks, or workflow), in the same single request. The description comes from the first source that has one: `gate.scope.description` in `rulebook.json`, then `description` in `package.json`, then the first prose paragraph of `README.md` (headings, badge lines, HTML, tables and code fences are skipped); whitespace is collapsed and it is clipped to 400 chars. A missing or unreadable source counts as none. With no description — or with `gate.scope.enabled: false` — the question is not asked and `routing.inProjectScope` is `null`, exactly as before. Otherwise `routing.inProjectScope` is `true` at `≥ 0.7`, `false` at `≤ 0.3` (the instruction then says "Off-topic for this project — confirm with the operator before acting."), and `null` in between, listed in `undecided`.

**Thresholds**: a choice is decided at `confidence ≥ 0.6`; a yes/no at `≥ 0.7` (true) or `≤ 0.3` (false), undecided in between; a risk flag is true at `≥ 0.5` and never undecided. Undecided fields are `null` in `routing` and listed in `undecided`. Post-rules: `small-fix` ⇒ `needsTask:false`; a decided existing task ⇒ `needsTask:true`; `answer-to-open-question` with no decided task picks the task owning the first open question; an undecided `model` with a decided agent follows the routing table (architect/code-reviewer/security-reviewer → fable, researcher → haiku, else opus).

```json
{ "success": true, "available": true, "model": "jev-1.13.0",
  "routing": { "kind": "task-work", "needsTask": true, "existingTaskId": "phase1_add-auth",
               "model": "opus", "agentType": "implementer", "skill": "languages/typescript",
               "parallel": false, "needsOperatorDecision": false, "inProjectScope": true,
               "risk": { "destructiveGit": false, "osScheduling": false, "secrets": false } },
  "undecided": [], "decisions": [ { "id": "kind", "primitive": "choice", "answer": "task_work",
                                    "probability": 0.91, "confidence": 0.89, "decided": true } ],
  "instruction": "Jev routing: kind=task-work, needsTask=yes (reuse phase1_add-auth), ...",
  "elapsedMs": 812, "stateBytes": 1934, "usage": { "input_tokens": 2310, "output_tokens": 164 } }
```

**When Jev cannot be used** the result is still `success:true`, with `available:false`, a `reason`, and `instruction: "Gate unavailable (<reason>); proceed under CLAUDE.md Orchestration rules."`:

| `reason` | Cause |
|----------|-------|
| `disabled` | `RULEBOOK_GATE=off` in the environment, or `integrations.typesafe.enabled:false` in `rulebook.json` — no network call |
| `no-key` | no `TYPESAFE_API_KEY` in the environment or in the project's `.env`; `instructions` (how to create and export the key) is included the first time per server process |
| `timeout` | the call did not finish inside the gate's 8.5 s deadline (the server's per-tool guard is 10 s) |
| `http` / `network` / `bad-response` | an HTTP error, a connection failure, or a malformed answer; `detail` carries the message with any key redacted |

**Key and network**: the key is read from `process.env.TYPESAFE_API_KEY`, else from the single `TYPESAFE_API_KEY=` line of `<project>/.env` (other variables are never read, `process.env` is never modified). It is sent only as `Authorization: Bearer …`, and never appears in results, errors or logs. Each attempt times out after 10 s (capped by the deadline); 429, 529 and connection errors are retried at most twice with exponential backoff plus jitter; other errors fail at once.

**Decision log**: when `features.logging` is true in `rulebook.json`, each call appends one line to `.rulebook/logs/gate.jsonl` — a 16-hex prompt hash, `routing`, `undecided`, `usage`, `elapsedMs`, `stateBytes` (never the prompt text or the key); the newest 500 lines are kept.

**CLI**: `rulebook gate "<prompt>" [--notes <text>] [--json]` prints the routing as a readable block (or the full result as JSON) and exits 0 even when unavailable. `rulebook gate --check [--json] [--strict]` reports where the key was found (`env`, `.env`, or not found — never the value) and makes one cheap live call (`state: "ping"`, one yes/no question) with its latency and token usage; it exits 0 either way, or 2 with `--strict` when the gate is unavailable.

### Prompt hook (v7.4, `UserPromptSubmit`)

The main session no longer has to remember to call the gate: a Claude Code `UserPromptSubmit` hook runs it on every operator prompt and hands the routing to the model as context. The model calls `rulebook_gate` by hand only when no hook routing is in its context.

**Install**: `rulebook init`, `rulebook update` and `rulebook claude` copy `templates/hooks/jev-gate.sh` to `.claude/hooks/jev-gate.sh` and add one entry to `.claude/settings.json`:

```json
{ "hooks": { "UserPromptSubmit": [
  { "hooks": [ { "type": "command",
                 "command": "bash $CLAUDE_PROJECT_DIR/.claude/hooks/jev-gate.sh prompt",
                 "timeout": 8 } ] } ] } }
```

The entry is identified by its command (`jev-gate.sh prompt`): it is upserted once (a second run leaves the file byte-identical), user hooks on the same event stay untouched and in order, and the entry is removed when the hook is turned off. The wrapper finds the CLI (`rulebook` on `PATH`, then `$CLAUDE_PROJECT_DIR/node_modules/.bin/rulebook`) and runs `rulebook hook prompt-gate` with the hook JSON on stdin; without a CLI it exits 0 silently.

**What the model sees**: `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"…"}}`, where the context (at most 1024 bytes) is the line `Jev routing (rulebook prompt hook) — do not call rulebook_gate again for this prompt`, the gate's `instruction`, and one warning line per risk flag at or above 0.5 that does not block.

**Block rule**: when Jev is available and `risk_os_scheduling` is at or above `gate.promptHook.blockThreshold`, the hook answers `{"decision":"block","reason":…}` — OS-level scheduling is never allowed (Tier 1); the reason names the rule and how to turn the hook off. Destructive git and secrets never block here: the operator's own prompt is the authorization, so they become warnings that point to the Git safety and secrets rules. The MCP tool and `rulebook gate` never block.

**Off-topic rule** (only when the project has a description): when `in_project_scope` is at or below `gate.scope.offTopicBelow`, the hook applies `gate.scope.onOffTopic`. `ask` (default) keeps the prompt and makes the first context line `Confirm with the operator before acting: this prompt looks unrelated to this project "<first 80 chars of the description>" (Jev in_project_scope p=…)`; `block` answers `{"decision":"block","reason":…}` with a reason that quotes the description and names `gate.scope.onOffTopic`. Above `offTopicBelow` and up to 0.3 the context only gains a `Warning: possibly off-topic …` line. In all three cases the hook's line replaces the gate's generic off-topic sentence. The OS-scheduling block is checked first and wins.

**Config** (`.rulebook/rulebook.json`):

| Key | Default | Meaning |
|-----|---------|---------|
| `gate.promptHook.enabled` | `true` | install and run the hook; always off when `integrations.typesafe.enabled` is `false` |
| `gate.promptHook.deadlineMs` | `5000` | deadline for the whole gate call inside the hook, clamped to 1000–8500 ms; the settings `timeout` is `ceil(deadlineMs / 1000) + 3` seconds |
| `gate.promptHook.blockThreshold` | `0.9` | `risk_os_scheduling` probability that blocks, clamped to 0.5–1 |
| `gate.scope.enabled` | `true` | ask `in_project_scope` when a description exists; `false` never asks it |
| `gate.scope.description` | — | project description for the scope question; overrides `package.json` and `README.md` |
| `gate.scope.offTopicBelow` | `0.15` | `in_project_scope` probability at or below which `onOffTopic` applies, clamped to 0–0.3 |
| `gate.scope.onOffTopic` | `ask` | `ask`: confirm-with-the-operator line first in the context; `block`: stop the prompt |

**Fail-open**: no key, `RULEBOOK_GATE=off`, TypeSafe opted out, the hook disabled, a timeout, a network or HTTP error, a bad response, unreadable or non-JSON stdin, an empty prompt, a missing CLI, or any thrown error → exit 0 with no output, and the prompt goes through unchanged. The hook always exits 0.

**Decision log**: with `features.logging` on, hook calls are logged to `.rulebook/logs/gate.jsonl` like any other gate call, with `"source": "hook"` (the MCP tool writes `"mcp"`, the CLI `"cli"`).

**Turn it off**: set `"gate": {"promptHook": {"enabled": false}}` in `rulebook.json` and run `rulebook update` (the entry is removed), or opt out of TypeSafe with `--no-typesafe` (also removes it). `RULEBOOK_GATE=off` silences it for one environment without touching settings.

### Tool-call gate (v7.4, `PreToolUse`, opt-in)

The prompt hook judges what the operator asked for; the tool-call gate judges what an agent is about to do. A Claude Code `PreToolUse` hook asks Jev a few yes/no questions about each matched tool call and answers `deny` or `ask` with a reason — or nothing, so the normal permission flow applies. It never answers `allow`: your permission rules still decide everything it lets through. Off by default.

**Install**: with `"gate": {"toolHook": {"enabled": true}}` in `rulebook.json`, `rulebook init`, `update` and `claude` add one `PreToolUse` entry after the rulebook guard entries (same `.claude/hooks/jev-gate.sh`, argument `tool`):

```json
{ "matcher": "Bash|Edit|Write",
  "hooks": [ { "type": "command",
               "command": "bash $CLAUDE_PROJECT_DIR/.claude/hooks/jev-gate.sh tool",
               "timeout": 4 } ] }
```

Each Jev entry is identified by its command (`jev-gate.sh prompt`, `jev-gate.sh tool`), so turning one on or off never touches the other; the entry is upserted once (a second run leaves the file byte-identical), user hooks stay untouched, and it is removed when the gate is turned off or TypeSafe is opted out.

**Order, cheapest first** (Claude Code runs matching hooks in parallel, so the order lives inside this one hook):

1. The wrapper runs the installed `no-os-scheduling.sh` guard on the same payload; its `deny` is printed as-is and the CLI is never called.
2. Tools outside `matcher` get no answer.
3. A deterministic destructive-git check on Bash commands — `git reset --hard`, `push --force` / `-f` / `--force-with-lease`, `clean -f`, `checkout -- .`, `restore .`, `stash` (not `list`/`show`), `branch -D`, anchored to a git invocation — answers `ask` citing CLAUDE.md "Git safety". No key or Jev call needed.
4. The cache (below); a hit answers with no request.
5. One Jev request within the deadline.

**What Jev sees** (at most 3072 bytes): project id and languages, the active task (id + title), the Tier 1 rules (destructive git without authorization, OS scheduling, hook bypass such as `--no-verify`, reading or printing secrets, stubs/TODOs), and a summary of the call — Bash: the command (≤ 1024 chars); Edit: the file (relative when inside the project), old/new sizes and a `new_string` preview (≤ 512); Write: the file, content size and a preview (≤ 512); other tools: the file and a JSON preview of the input. Over budget, the preview, then the command, then the path are cut.

**Criteria** (each a yes/no probability that the call is fine, one request): `safe_reversible`, `no_secret_exposure`, `follows_project_rules`, and `in_task_scope` when a task is in progress. Below `denyBelow` (0.5) → `deny`; below `askBelow` (0.7) → `ask`; `in_task_scope` never goes past `ask`. The most severe criterion wins, and the reason lists each failing criterion with its probability (`safe_reversible p=0.30 (may destroy work or be hard to undo)`).

**Redaction**: every summary string goes through `redactSecrets()` — `redact()` (TypeSafe keys, `Bearer …`) plus `sk-…`, `ghp_…`/`github_pat_…`, `AKIA…`, `xox?-…`, PEM private-key blocks and the value of any `*KEY*`/`*TOKEN*`/`*SECRET*`/`*PASSWORD*` assignment — before it is clipped. The content of `.env*` files is never sent: the preview reads `[env file — not sent]`.

**Cache**: `.rulebook/cache/tool-gate.json` (ignored by the `/.rulebook/*` gitignore rule), keyed by sha256 of tool + redacted summary + active task id + question-set version; each entry holds the decision, the probabilities and the time. Entries live `cacheTtlMs` (15 min); the newest 200 are kept; the file is written atomically (temp file + rename), and an unreadable file counts as empty. Only Jev answers are cached — never a fail-open result.

**Latency**: everything after the destructive-git check (task list, cache, Jev) runs within `deadlineMs` (default 2000 ms); the settings `timeout` is `ceil(deadlineMs / 1000) + 2` seconds.

**Config** (`.rulebook/rulebook.json`):

| Key | Default | Meaning |
|-----|---------|---------|
| `gate.toolHook.enabled` | `false` | install and run the gate; always off when `integrations.typesafe.enabled` is `false` |
| `gate.toolHook.matcher` | `Bash\|Edit\|Write` | `PreToolUse` matcher (a tool-name regex), also applied inside the hook |
| `gate.toolHook.denyBelow` | `0.5` | a criterion below this denies (`in_task_scope`: asks); clamped 0–1 and never above `askBelow` |
| `gate.toolHook.askBelow` | `0.7` | a criterion below this asks; clamped 0–1 |
| `gate.toolHook.deadlineMs` | `2000` | clamped to 500–5000 ms |
| `gate.toolHook.cacheTtlMs` | `900000` | cache lifetime; `0` never reuses an answer |

**Fail-open**: no key, `RULEBOOK_GATE=off`, TypeSafe opted out, the gate disabled, a timeout, a network or HTTP error, a bad response, unreadable stdin, a missing CLI, or any thrown error → exit 0 with no output. The destructive-git `ask` needs no key, so it works without Jev.

**Decision log**: with `features.logging` on, each decision appends one line to `.rulebook/logs/tool-gate.jsonl` — a 16-hex summary hash, tool name, decision, per-criterion probabilities, `cached`, `elapsedMs` (plus `precheck` or `error` when relevant); never the command text, file content or key. The newest 500 lines are kept.

## Error Handling

All MCP functions return structured error responses:

```typescript
{
  success: false,
  message: "Error description",
  // ... other fields may be present
}
```

Common error scenarios:
- **Task not found**: When querying a non-existent task
- **Task already exists**: When creating a duplicate task
- **Validation errors**: When archiving a task with invalid format
- **File system errors**: When unable to read/write task files

## Usage Examples

### Creating a Task via MCP

```typescript
// Using MCP client
const result = await mcpClient.callTool('rulebook_task_create', {
  taskId: 'add-feature-x',
  proposal: {
    why: 'Users need feature X to improve productivity',
    whatChanges: 'Add feature X with Y and Z capabilities',
    impact: {
      affectedSpecs: ['features/spec.md'],
      affectedCode: ['src/features/'],
      breakingChange: false,
      userBenefit: 'Improved productivity and user experience'
    }
  }
});

console.log(result.structuredContent);
// {
//   success: true,
//   taskId: 'add-feature-x',
//   message: 'Task add-feature-x created successfully',
//   path: 'rulebook/tasks/add-feature-x'
// }
```

### Listing Tasks with Filters

```typescript
// List only in-progress tasks
const result = await mcpClient.callTool('rulebook_task_list', {
  status: 'in-progress',
  includeArchived: false
});

console.log(result.structuredContent.tasks);
// Array of task objects with status 'in-progress'
```

### Updating Task Status

```typescript
// Mark task as completed
const result = await mcpClient.callTool('rulebook_task_update', {
  taskId: 'add-feature-x',
  status: 'completed'
});

console.log(result.structuredContent);
// {
//   success: true,
//   taskId: 'add-feature-x',
//   message: 'Task add-feature-x updated successfully'
// }
```

## Integration with Cursor

The MCP server is configured in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "rulebook": {
      "command": "node",
      "args": ["dist/mcp/rulebook-server.js"],
      "env": {}
    }
  }
}
```

After configuration, restart Cursor to load the MCP server. The tools will be available in the Cursor MCP panel.

## Troubleshooting

### Server Not Starting

**Problem**: MCP server fails to start

**Solutions**:
1. Verify Node.js version: `node --version` (requires Node.js 20+)
2. Check if `dist/mcp/rulebook-server.js` exists: Run `npm run build`
3. Verify MCP configuration in `.cursor/mcp.json`
4. Check Cursor logs for error messages

### Tools Not Appearing

**Problem**: Tools don't appear in Cursor MCP panel

**Solutions**:
1. Restart Cursor completely
2. Verify MCP server is running: Check Cursor MCP status panel
3. Check server logs for registration errors
4. Verify Zod version compatibility: `npm list zod` (should be 3.25.76)

### Schema Conversion Errors

**Problem**: `keyValidator._parse is not a function` error

**Solutions**:
1. Ensure Zod v3 is installed: `npm install zod@3.25.76`
2. Rebuild project: `npm run build`
3. Restart MCP server

### Task Operations Failing

**Problem**: Task operations return errors

**Solutions**:
1. Verify task exists: Use `rulebook_task_list` to check
2. Check file permissions: Ensure write access to `rulebook/tasks/` directory
3. Verify task format: Use `rulebook_task_validate` to check format
4. Check error messages in response for specific issues

## Best Practices

1. **Always validate before archiving**: Use `rulebook_task_validate` before archiving tasks
2. **Handle errors gracefully**: Check `success` field in responses
3. **Use structured content**: Prefer `structuredContent` over parsing text content
4. **Filter tasks efficiently**: Use status filters to reduce response size
5. **Update status incrementally**: Update task status as work progresses

## Version Compatibility

- **MCP SDK**: `@modelcontextprotocol/sdk@^1.22.0`
- **Zod**: `zod@3.25.76` (required for compatibility)
- **Node.js**: `>=20.0.0`

## Support

For issues or questions:
- Check [README.md](../README.md) for general information
- Review [RULEBOOK.md](../rulebook/specs/RULEBOOK.md) for task management details
- Open an issue on GitHub: https://github.com/hivellm/rulebook/issues

