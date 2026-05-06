# Rulebook MCP — tool surface audit

## MODIFIED Requirements

### Requirement: MCP tool catalog is curated
The system SHALL expose only MCP tools with a documented canonical
use-case. Tools whose audit fails to justify their inclusion MUST be
removed and SHALL NOT be reintroduced without a corresponding entry in
`.rulebook/specs/RULEBOOK_MCP.md`.

#### Scenario: Audited catalog
Given the post-audit `src/mcp/rulebook-server.ts`
When the MCP server starts
Then every registered tool has a matching entry in `RULEBOOK_MCP.md`
And `RULEBOOK_MCP.md` lists no tools that the server does not expose.

#### Scenario: Removed tool fails closed
Given a script invoking a removed tool name (e.g. `rulebook_blockers`)
When the call reaches the server
Then the server returns the standard "unknown tool" error
And no silent fallback executes.
