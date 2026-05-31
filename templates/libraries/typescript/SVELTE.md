<!-- SVELTE:START -->
# Svelte Rules

## Conventions
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`) for all new code; legacy reactive declarations (`$:`) are deprecated
- Declare component props with `let { propName } = $props()` and type them with TypeScript interfaces
- Use `$derived` for computed values instead of `$effect` with an intermediate variable
- Scope side effects that depend on reactive state inside `$effect`; clean up by returning a teardown function
- Use `{#each items as item (item.id)}` with a key expression to enable efficient DOM reconciliation
- Prefer Svelte stores (`writable`, `readable`, `derived`) for cross-component shared state

## Avoid
- Using `$effect` to synchronize two pieces of state — use `$derived` instead
- Directly mutating arrays/objects in `$state` without reassignment when deep reactivity is needed — use `$state` with structural replacement or `SvelteMap`/`SvelteSet`
- Importing browser globals at module level — guard with `if (browser)` from `$app/environment`
<!-- SVELTE:END -->
