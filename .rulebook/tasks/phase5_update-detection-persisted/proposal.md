# Proposal: phase5_update-detection-persisted

## Why
In update.ts an early updateConfig write (detected languages, modules, merged skills, rulebookDir hard-coded to .rulebook) is overwritten by the later config rebuild, so newly detected skills are never saved and the early write is dead.

## What Changes
Make update compute detection once and persist it through the single rebuild path; drop the dead write and the hard-coded rulebookDir.

## Impact
- Affected specs: none
- Affected code: src/cli/commands/update.ts
- Breaking change: NO
- User benefit: none
