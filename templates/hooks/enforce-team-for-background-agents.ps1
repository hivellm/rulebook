# Claude Code PreToolUse hook for the Agent tool (PowerShell variant).
#
# Policy enforced by @hivehub/rulebook v5.3.0:
#   - A single Agent call is fine (foreground or background).
#   - Spawning multiple standalone background Agents is FORBIDDEN.
#     Parallel multi-agent work MUST go through a Team so agents can
#     communicate via SendMessage.
#
# Block any Agent invocation with run_in_background=true UNLESS it
# targets subagent_type=team-lead or provides a team_name. This forces
# background parallel work through a Team.

$ErrorActionPreference = 'Stop'

$input = [Console]::In.ReadToEnd()
$data = $null
try { $data = $input | ConvertFrom-Json } catch {}

$toolName = $null
if ($data -and $data.PSObject.Properties.Name -contains 'tool_name') { $toolName = $data.tool_name }

if ($toolName -ne 'Agent') {
    Write-Output '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
    exit 0
}

$runInBackground = $false
$subagentType = ''
$teamName = ''
if ($data.tool_input) {
    if ($data.tool_input.PSObject.Properties.Name -contains 'run_in_background') {
        $runInBackground = [bool]$data.tool_input.run_in_background
    }
    if ($data.tool_input.PSObject.Properties.Name -contains 'subagent_type') {
        $subagentType = [string]$data.tool_input.subagent_type
    }
    if ($data.tool_input.PSObject.Properties.Name -contains 'team_name') {
        $teamName = [string]$data.tool_input.team_name
    }
}

if (-not $runInBackground) {
    Write-Output '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
    exit 0
}

if ($subagentType -eq 'team-lead' -or $teamName) {
    Write-Output '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
    exit 0
}

$reason = 'POLICY VIOLATION: Spawning standalone background Agents is forbidden. Multi-agent parallel work MUST use a Team so agents can communicate via SendMessage. Either (a) use TeamCreate to create a team, (b) spawn a team-lead that creates the team, or (c) set team_name on the Agent call. See .claude/rules/multi-agent-teams.md for the policy.'

$out = @{
    hookSpecificOutput = @{
        hookEventName            = 'PreToolUse'
        permissionDecision       = 'deny'
        permissionDecisionReason = $reason
    }
} | ConvertTo-Json -Compress -Depth 4

Write-Output $out
exit 0
