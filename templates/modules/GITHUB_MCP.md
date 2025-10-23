<!-- GITHUB_MCP:START -->
# GitHub MCP Server Integration

**CRITICAL**: Use GitHub MCP Server for automated workflow validation and CI/CD monitoring.

## GitHub MCP Overview

The GitHub MCP Server provides programmatic access to GitHub API for:
- Repository information
- Workflow runs and status
- Pull requests
- Issues
- Branches and commits

## Installation & Configuration

```json
// Add to mcp.json or mcp-config.json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Workflow Validation After Push

**CRITICAL**: After every `git push`, validate workflow status.

### Automatic Workflow Monitoring

```
After git push execution:

1. Wait 5-10 seconds for workflow to trigger
2. Check workflow status using GitHub MCP
3. If workflows are running:
   ✅ Note: "CI/CD workflows triggered, will check status later"
   ✅ Continue with other tasks
   ✅ Check again in next interaction/message
   
4. If workflows completed:
   ✅ Check if all passed
   ❌ Check if any failed
   
5. If any workflow failed:
   ❌ Fetch error logs via GitHub MCP
   ❌ Display errors to user
   ❌ Analyze root cause
   ❌ Propose fixes
   ❌ Implement fixes following AGENTS.md
   ❌ Re-run quality checks
   ❌ Commit fixes
   ❌ Provide push command for retry
```

### Workflow Status Checking

```javascript
// Example workflow check logic
async function checkWorkflowStatus() {
  // 1. Get latest workflow runs for current commit
  const workflows = await github.getWorkflowRuns({
    owner: 'your-org',
    repo: 'your-repo',
    head_sha: currentCommitSha
  });
  
  // 2. Check status
  for (const workflow of workflows) {
    if (workflow.status === 'in_progress' || workflow.status === 'queued') {
      console.log(`⏳ ${workflow.name}: Running...`);
      // Skip for now, check later
      continue;
    }
    
    if (workflow.conclusion === 'failure') {
      console.log(`❌ ${workflow.name}: FAILED`);
      
      // 3. Fetch error details
      const jobs = await github.getWorkflowJobs({
        workflow_run_id: workflow.id
      });
      
      // 4. Display errors
      for (const job of jobs.filter(j => j.conclusion === 'failure')) {
        console.log(`\nJob: ${job.name}`);
        console.log(`Error: ${job.steps.find(s => s.conclusion === 'failure')?.name}`);
        
        // 5. Get logs
        const logs = await github.getWorkflowLogs({
          workflow_run_id: workflow.id
        });
        
        console.log('Logs:', logs);
      }
      
      // 6. Return errors for fixing
      return {
        hasErrors: true,
        workflows: workflows.filter(w => w.conclusion === 'failure')
      };
    }
    
    if (workflow.conclusion === 'success') {
      console.log(`✅ ${workflow.name}: Passed`);
    }
  }
  
  return { hasErrors: false };
}
```

### Post-Push Workflow

```
Immediately after git push:

1. Inform user:
   "✅ Changes pushed to origin/main"
   "⏳ CI/CD workflows triggered, monitoring status..."

2. In next user message/interaction:
   - Check workflow status via GitHub MCP
   - Report results
   
3. If workflows still running:
   "⏳ CI/CD workflows still running:
   - TypeScript Tests: in_progress
   - TypeScript Lint: queued
   
   Will check again in next interaction."
   
4. If workflows completed successfully:
   "✅ All CI/CD workflows passed:
   - TypeScript Tests: ✅ passed
   - TypeScript Lint: ✅ passed
   - Coverage: 95.2%
   
   Deployment ready!"
   
5. If workflows failed:
   "❌ CI/CD workflow failures detected:
   
   Failed: TypeScript Tests
   Job: test (ubuntu-latest, 20.x)
   Error: Test 'should validate input' failed
   
   Logs:
   [error details]
   
   Analyzing error and proposing fix..."
```

## Error Recovery Workflow

**When CI/CD fails:**

```
1. Fetch complete error information:
   - Workflow name
   - Job name
   - Failed step
   - Error message
   - Full logs

2. Analyze against AGENTS.md:
   - Is it a test failure?
   - Is it a linting error?
   - Is it a build error?
   - Is it an environment issue?

3. Propose fix:
   - Identify root cause
   - Reference AGENTS.md standards
   - Suggest specific changes
   - Include test updates if needed

4. Implement fix:
   - Make necessary changes
   - Run full quality checks locally
   - Verify fix resolves issue
   - Commit fix with descriptive message

5. Provide push command:
   "Fix ready. Run to push:
   git push origin main
   
   This should resolve the CI/CD failure."

6. After next push:
   - Monitor workflows again
   - Verify fix worked
   - Report success/failure
```

## GitHub MCP Functions

### Repository Operations

```
- github.getRepository() - Get repo info
- github.listBranches() - List all branches
- github.getCurrentBranch() - Get current branch
- github.getCommit() - Get commit details
```

### Workflow Operations

```
- github.listWorkflows() - List all workflows
- github.getWorkflowRuns() - Get workflow runs
- github.getWorkflowJobs() - Get job details
- github.getWorkflowLogs() - Fetch logs
- github.rerunWorkflow() - Re-run failed workflow
```

### Status Monitoring

```
- github.getCheckRuns() - Get status checks
- github.getCombinedStatus() - Combined status
- github.waitForWorkflows() - Wait for completion
```

## Best Practices

### DO's ✅

- **ALWAYS** check workflows after push
- **MONITOR** workflow status proactively
- **FETCH** complete error logs on failures
- **ANALYZE** errors against AGENTS.md
- **FIX** issues before next feature
- **VERIFY** fixes locally before re-pushing
- **REPORT** workflow status to user
- **WAIT** if workflows still running
- **CHECK** again in next interaction

### DON'Ts ❌

- **NEVER** ignore workflow failures
- **NEVER** push again without fixing
- **NEVER** assume workflows will pass
- **NEVER** skip error analysis
- **DON'T** spam GitHub API (rate limits)
- **DON'T** check too frequently (wait 30s minimum)
- **DON'T** proceed if workflows failing
- **DON'T** create tags if CI/CD failed

## Integration with Git Workflow

### After Push Command

```
When push mode is 'manual':

1. User executes: git push origin main

2. AI should say:
   "Once you've pushed, I'll monitor the CI/CD workflows.
   Just send any message and I'll check the status."

3. On next user message:
   - Use GitHub MCP to check workflow status
   - Report results
   - Take action if needed

When push mode is 'auto':

1. AI executes: git push origin main

2. AI immediately says:
   "✅ Changes pushed
   ⏳ Monitoring CI/CD workflows..."

3. Wait 10 seconds

4. Check status via GitHub MCP
   - Report results
   - Fix if needed
```

### Workflow Status Messages

```
# Workflows Running
"⏳ CI/CD in progress:
- TypeScript Tests (ubuntu): running
- TypeScript Tests (windows): queued  
- TypeScript Lint: in_progress

I'll check again when you send your next message."

# All Passed
"✅ All CI/CD workflows passed!
- TypeScript Tests: ✅ 6/6 passed
- TypeScript Lint: ✅ passed
- Coverage: 90.4% ✅

Great work! Changes are production-ready."

# Some Failed
"❌ CI/CD failures detected:

Failed Workflow: TypeScript Tests
Platform: windows-latest, node 18.x
Failed Step: Run tests
Error: 
  tests/workflow-generator.test.ts > should generate VS Code settings
  AssertionError: expected false to be true

Root Cause: Path separator issue on Windows

Proposed Fix:
[show fix]

Shall I implement this fix?"

# Multiple Failures
"❌ Multiple CI/CD failures:

1. TypeScript Tests (windows): Path separator issue
2. TypeScript Lint: Prettier formatting  

I'll fix these issues in order. Starting with formatting..."
```

## Configuration

### GitHub Token Setup

```bash
# Create GitHub Personal Access Token
# Settings → Developer settings → Personal access tokens → Fine-grained tokens

Required permissions:
- Repository: Read access
- Actions: Read access
- Workflows: Read and Write access
- Contents: Read access

# Add to environment
export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxx

# Or add to .env (gitignored)
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxx
```

### MCP Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      },
      "disabled": false
    }
  }
}
```

## Proactive Monitoring

### Periodic Checks

```
If user is inactive and workflows were triggered:

Every interaction:
1. Check if there are pending workflow runs
2. Report status proactively
3. Alert on failures immediately

Example:
User: "Can you help with..."
AI: "Sure! But first - ⚠️  CI/CD workflow failed:
     [error details]
     
     Let me fix this first, then I'll help with your request."
```

### Continuous Integration Loop

```
1. Implement feature
2. Run quality checks locally
3. Commit changes
4. Push to remote
5. Monitor CI/CD via GitHub MCP
6. If failed:
   - Fetch errors
   - Analyze cause
   - Implement fix
   - Goto step 2
7. If passed:
   - Confirm to user
   - Proceed to next task
```

## Rate Limiting

```
GitHub API rate limits:
- Authenticated: 5,000 requests/hour
- Check workflows: ~1 request
- Get logs: ~1 request per workflow

Best practices:
- Check maximum once per minute
- Cache recent results
- Only check when necessary
- Don't spam API
```

## Example Workflow Validation

```typescript
// After user confirms push or AI pushes:

async function validateWorkflows() {
  console.log('⏳ Checking CI/CD workflow status...');
  
  // Get latest commit
  const commit = await github.getLatestCommit();
  
  // Get workflow runs for this commit
  const runs = await github.getWorkflowRuns({
    head_sha: commit.sha
  });
  
  if (runs.length === 0) {
    console.log('⏳ Workflows not yet triggered. Will check later.');
    return;
  }
  
  const running = runs.filter(r => r.status === 'in_progress' || r.status === 'queued');
  const failed = runs.filter(r => r.conclusion === 'failure');
  const passed = runs.filter(r => r.conclusion === 'success');
  
  if (running.length > 0) {
    console.log(`⏳ ${running.length} workflows still running...`);
    return;
  }
  
  if (failed.length > 0) {
    console.log(`❌ ${failed.length} workflows failed!`);
    
    for (const run of failed) {
      const jobs = await github.getWorkflowJobs({ run_id: run.id });
      const failedJobs = jobs.filter(j => j.conclusion === 'failure');
      
      for (const job of failedJobs) {
        console.log(`\n❌ ${run.name} - ${job.name}`);
        
        // Find failed step
        const failedStep = job.steps.find(s => s.conclusion === 'failure');
        if (failedStep) {
          console.log(`Step: ${failedStep.name}`);
          
          // Get logs
          const logs = await github.getJobLogs({ job_id: job.id });
          console.log('Error:', extractError(logs));
        }
      }
    }
    
    // Propose fixes
    console.log('\nAnalyzing failures and preparing fixes...');
  } else {
    console.log(`✅ All ${passed.length} workflows passed!`);
  }
}
```

## Quality Assurance

**Never push without confidence in CI/CD success:**

```
Before providing push command:

1. All local checks passed?
2. Similar changes passed CI before?
3. No experimental changes?
4. Followed AGENTS.md exactly?
5. Tests comprehensive?

If ANY uncertainty:
  ❌ Don't suggest push yet
  ✅ Say: "Let's verify locally first"
  ✅ Run additional checks
  ✅ Only push when certain
```

<!-- GITHUB_MCP:END -->

