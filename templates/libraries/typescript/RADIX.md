<!-- RADIX:START -->
# Radix UI Rules

## Conventions
- Install individual `@radix-ui/react-<primitive>` packages — never install the entire `@radix-ui/react` meta-package
- Compose primitives using the compound-component pattern (`Dialog.Root`, `Dialog.Trigger`, `Dialog.Content`, etc.) — never use internal sub-components directly
- Always provide accessible labels: use `VisuallyHidden` with `DialogTitle` / `AlertDialogTitle` to satisfy screen-reader requirements even when visually hidden
- Forward refs through custom wrappers using `React.forwardRef` so Radix can attach behavior correctly
- Control open state externally (`open` + `onOpenChange`) for dialogs and popovers that need lifecycle hooks (e.g., analytics, focus management)
- Use `asChild` to delegate rendering to your own element without adding extra DOM nodes

## Avoid
- Styling Radix components by targeting generated class names — use `data-*` attribute selectors (`data-state="open"`)
- Mixing multiple open-state sources (both `defaultOpen` and `open`) on the same component
- Removing `Dialog.Overlay` to skip the backdrop — it handles focus-trap and pointer-event blocking
<!-- RADIX:END -->
