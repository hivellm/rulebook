<!-- HEROUI:START -->
# HeroUI Rules

## Conventions
- Wrap the app in `<HeroUIProvider>` at the root; pass `navigate` from your router for link support
- Use the `color`, `variant`, and `size` props from the component API instead of overriding with raw Tailwind classes
- Extend or override tokens via `heroui()` plugin in `tailwind.config.ts` — never patch component internals
- Use `classNames` prop (object with slot keys) for targeted per-slot styling instead of wrapping with extra divs
- Prefer controlled components (`value` + `onChange`) for form inputs to keep state in one place
- Use `isDisabled`, `isLoading`, and `isInvalid` boolean props rather than custom conditional classes

## Avoid
- Importing components from deep internal paths — always import from `@heroui/react`
- Overriding component styles with `!important` — use slot-based `classNames` instead
- Rendering HeroUI components outside `<HeroUIProvider>` — theme context will be missing
<!-- HEROUI:END -->
