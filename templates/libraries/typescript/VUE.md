<!-- VUE:START -->
# Vue Rules

## Conventions
- Use the Composition API with `<script setup>` for all new components; Options API is legacy
- Declare reactive state with `ref()` for primitives and `reactive()` for objects; unwrap refs in templates automatically
- Use `computed()` for derived state — never compute values inside templates beyond simple expressions
- Define component props with `defineProps<{ ... }>()` using TypeScript generics for full type safety
- Use `defineEmits<{ ... }>()` to type emitted events explicitly
- Prefer `watch` with `{ immediate: true }` over duplicating logic in `onMounted` + `watch`

## Avoid
- Mutating props directly — emit an event and let the parent update state
- Using `$refs` to imperatively manipulate child component internals
- Mixing Composition API and Options API in the same component
- Relying on `v-html` with unsanitized user input — XSS risk
<!-- VUE:END -->
