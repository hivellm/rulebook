# Rulebook — multi-tool generator removal

## REMOVED Requirements

### Requirement: Multi-tool MCP stub generator
The system SHALL NOT scaffold MCP multi-tool stubs during `init`. New MCP
tools MUST be added directly to `src/mcp/rulebook-server.ts` following the
existing hand-curated pattern.

#### Scenario: init skips the multi-tool step
Given an empty project directory
When the user runs `rulebook init`
Then no multi-tool stub files are written
And the existing MCP server registration is unaffected.
