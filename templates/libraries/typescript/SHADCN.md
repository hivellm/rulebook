<!-- SHADCN:START -->
# shadcn/ui Rules

## Conventions
- Add components with `npx shadcn@latest add <component>` — components are copied into `components/ui/` and owned by your repo
- Customize component source directly in `components/ui/` — shadcn/ui components are not a dependency, they are source code
- Use the `cn()` utility (auto-generated in `lib/utils.ts`) for all className merging within component files
- Keep shadcn/ui components as thin wrappers — add domain logic in separate consumer components, not inside `components/ui/`
- Re-run `npx shadcn@latest add <component>` to pull upstream changes; review the diff before accepting
- Use the `variant` and `size` props from `cva` variants instead of ad-hoc conditional classes

## Avoid
- Editing generated component files and then expecting `shadcn add` updates to merge cleanly — commit your customizations clearly
- Importing directly from `@radix-ui/*` inside application code when a shadcn wrapper already exists
- Adding business logic or data-fetching inside `components/ui/` files
<!-- SHADCN:END -->
