---
name: accessibility
description: Accessibility audit for WCAG compliance and usability
model: haiku
context: fork
agent: accessibility-reviewer
---
Audit accessibility for: $ARGUMENTS

If no arguments, audit the entire frontend codebase.

Steps:
1. Check semantic HTML usage (headings, landmarks, labels)
2. Verify ARIA attributes are correct and complete
3. Test keyboard navigation flow
4. Check color contrast ratios meet WCAG 2.1 AA
5. Report violations with severity and remediation steps
