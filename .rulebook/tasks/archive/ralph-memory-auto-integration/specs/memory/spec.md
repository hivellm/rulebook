# Spec: Ralph Memory Auto-Integration

## Post-Iteration Save Requirements

- SHALL save iteration learnings to memory after each completed iteration
- Learning entry SHALL have: `type: "learning"`, `title: "Ralph: <story-id> iteration <N>"`, `content: <learnings>`, `tags: ["ralph", "autonomous-loop", story-id]`
- Quality gate failures SHALL be saved as: `type: "bug"`, with error output in content
- Story completion SHALL be saved as: `type: "observation"`, summary in content
- SHALL use the project's configured memory manager (from rulebook.json)
- SHALL NOT fail the iteration if memory save fails (fire-and-forget pattern)

## Pre-Loop Context Load Requirements

- SHALL search memory for `tags: ["ralph"]` at the start of each Ralph run
- SHALL inject retrieved learnings into the first iteration's context/prompt
- SHALL limit loaded learnings to the 5 most recent (avoid prompt bloat)
- SHALL gracefully handle empty memory (no learnings found = start fresh)

## Memory Disabled Handling

- SHALL skip all memory operations if `config.memory.enabled === false`
- SHALL log a debug message to stderr when memory is disabled
- MUST NOT throw when memory is disabled
