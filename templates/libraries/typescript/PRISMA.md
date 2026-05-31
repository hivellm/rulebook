<!-- PRISMA:START -->
# Prisma Rules

## Conventions
- Instantiate `PrismaClient` once as a singleton and export it — never instantiate per-request (especially in Next.js dev with hot-reload)
- Use `prisma.$transaction([...])` for multi-step writes that must be atomic; use the interactive transaction callback form for reads-then-writes
- Always select only the fields you need with `select` or omit sensitive fields with `omit` — never return full records containing passwords/tokens
- Use `include` for eager-loading relations; use nested `select` inside `include` to avoid over-fetching
- Run `prisma migrate dev` in development and `prisma migrate deploy` in CI/production — never use `db push` in production
- Type query results with `Prisma.UserGetPayload<{ select: { ... } }>` for precise return types

## Avoid
- Calling `prisma.$disconnect()` in serverless/edge functions per-invocation — let the connection pool manage lifecycle
- Using raw `prisma.$queryRaw` without `Prisma.sql` tagged template — SQL injection risk
- Checking `prisma.model.findFirst` for existence checks in a loop — use `findMany` with `where` or `count`
<!-- PRISMA:END -->
