<!-- TRPC:START -->
# tRPC Rules

## Conventions
- Define all procedures in a router tree and export the `AppRouter` type — this is the contract shared with the client
- Validate all inputs with Zod schemas passed to `input()` — never trust raw input inside procedure handlers
- Use `protectedProcedure` (a middleware-wrapped base procedure) to enforce authentication — never check session ad-hoc inside handlers
- Use `useUtils()` (tRPC v11) for cache invalidation after mutations — call `utils.<router>.<procedure>.invalidate()`
- Co-locate server-side router files under `server/routers/`; keep the client-side `trpc` init in a single `lib/trpc.ts`
- Use `createCallerFactory` for server-side tRPC calls within Server Components or server actions — avoids HTTP round-trips

## Avoid
- Exposing the server router object to the client bundle — only the `AppRouter` type should cross the boundary
- Returning raw database models from procedures — map to response DTOs to avoid leaking sensitive fields
- Fetching data with `useQuery` inside event handlers — use `utils.<procedure>.fetch()` for imperative calls
<!-- TRPC:END -->
