<!-- TAILWIND:START -->
# Tailwind CSS Rules

## Conventions
- Compose utilities directly in markup; extract to components or `@apply` only for highly repeated multi-class patterns
- Use the `cn()` helper (clsx + tailwind-merge) to merge conditional classes — avoids specificity conflicts
- Configure custom design tokens in `tailwind.config.ts` under `theme.extend` — never override the default scale unless intentional
- Use `dark:` variant classes for dark mode; configure `darkMode: "class"` for manual toggle control
- Prefer responsive prefixes (`sm:`, `md:`, `lg:`) on the variant side rather than writing separate media queries
- Use `group` and `peer` utilities for parent-driven and sibling-driven state styling

## Avoid
- Mixing arbitrary values (`w-[347px]`) for dimensions that belong in the design token scale
- Writing long `className` strings inline without `cn()` — order-dependent merges produce hard-to-debug styles
- Using `!important` modifiers (`!text-red-500`) to override conflicts — fix the specificity root cause instead
<!-- TAILWIND:END -->
