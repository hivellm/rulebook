---
name: /rulebook-knowledge-add
id: rulebook-knowledge-add
category: Rulebook
description: Add a pattern or anti-pattern to the project knowledge base.
---
<!-- RULEBOOK:START -->
**Guardrails**
- Knowledge entries are auto-injected into AGENTS.md on `rulebook update`, making them visible to all AI assistants.
- Patterns go to `.rulebook/knowledge/patterns/`, anti-patterns to `.rulebook/knowledge/anti-patterns/`.

**Steps**
1. **Determine Type**: Ask if this is a `pattern` (good practice to follow) or `anti-pattern` (bad practice to avoid).

2. **Gather Details**:
   - **Title**: Short, descriptive name (e.g., "Repository Pattern", "God Object")
   - **Category**: `architecture` | `code` | `testing` | `security` | `performance` | `devops`
   - **Description**: What the pattern/anti-pattern is
   - **Example**: Code showing correct (or incorrect) usage
   - **When to Use**: Situations where this applies
   - **When NOT to Use**: Exceptions and edge cases
   - **Tags**: For searchability

3. **Create Entry**:
   ```bash
   rulebook knowledge add <type> "<title>" --category <category> --description "<desc>"
   ```

4. **Enrich the Entry**: Open `.rulebook/knowledge/<type>s/<slug>.md` and fill in Example, When to Use, and When NOT to Use sections with concrete code examples.

5. **Verify**:
   ```bash
   rulebook knowledge show <slug>
   ```

**Reference**
- Use `rulebook knowledge list` to see all entries
- Use `rulebook knowledge list --type pattern --category architecture` to filter
- Use `rulebook knowledge remove <slug>` to delete an entry
- Entries appear in AGENTS.md "Project Knowledge" section after `rulebook update`
<!-- RULEBOOK:END -->
