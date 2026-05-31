<!-- ZOD:START -->
# Zod Rules

## Conventions
- Define schemas once and derive TypeScript types with `z.infer<typeof schema>` — never duplicate types manually
- Use `.parse()` at trust boundaries (API routes, form submissions, env vars); use `.safeParse()` when you need to handle errors without throwing
- Coerce external string inputs (query params, form fields) with `z.coerce.number()` / `z.coerce.boolean()` instead of manual casting
- Validate environment variables at startup with a Zod schema and export the typed result — fail fast on misconfiguration
- Use `.transform()` to normalize data (e.g., trim strings, lowercase emails) in the same schema that validates it
- Use `z.discriminatedUnion("type", [...])` for tagged union types — faster and produces better error messages than `z.union`

## Avoid
- Using `.optional()` on fields that should always be present — it widens the type unnecessarily
- Calling `.parse()` on already-validated internal data — validate once at the boundary, pass typed values inward
- Building complex conditional logic with `.superRefine()` when `.refine()` covers the case
- Catching Zod errors generically — use `err instanceof ZodError` and inspect `err.errors` for structured messages
<!-- ZOD:END -->
