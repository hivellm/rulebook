<!-- DRIZZLE:START -->
# Drizzle ORM Rules

## Conventions
- Define schema in dedicated `schema.ts` files co-located by domain; export tables and inferred types together
- Use `drizzle-zod` or `drizzle-valibot` to derive insert/select validation schemas from table definitions — single source of truth
- Use `db.transaction(async (tx) => { ... })` for atomic multi-step operations; pass `tx` to all writes inside
- Prefer `.returning()` after inserts/updates instead of a separate select round-trip
- Type query results with `typeof table.$inferSelect` and `typeof table.$inferInsert` — never manually duplicate column types
- Use `sql` tagged template from `drizzle-orm` for raw SQL fragments; never interpolate user input directly

## Avoid
- Importing the db instance inside schema files — schema must be a pure declaration with no runtime dependencies
- Running `drizzle-kit push` in production — use `drizzle-kit generate` + migration files for reproducible deploys
- Chaining `.where()` conditions with string concatenation — use `and()`, `or()`, `eq()` operators from `drizzle-orm`
<!-- DRIZZLE:END -->
