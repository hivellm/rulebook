<!-- NEXT:START -->
# Next.js Rules

## Conventions
- Use the App Router (`app/`) for all new projects; Pages Router is legacy
- Mark components `"use client"` only when they require browser APIs or interactivity; keep the default server-component boundary
- Fetch data in Server Components using `async/await` directly — avoid `useEffect` data fetching
- Use `next/image` for all images with explicit `width`/`height` or `fill` to avoid layout shift
- Colocate route-specific logic in `app/<segment>/page.tsx`; share layouts via `layout.tsx`
- Use `next/font` to load fonts — never load external font URLs in `<head>` manually
- Type `searchParams` and `params` as `Promise<...>` in Next.js 15+ page/layout props

## Avoid
- Importing server-only modules into Client Components (triggers runtime errors)
- Using `getServerSideProps` or `getStaticProps` in the App Router — they don't exist there
- Wrapping the entire app in `"use client"` — it defeats server rendering
- Hardcoding `localhost` URLs; use environment variables for all API base URLs
<!-- NEXT:END -->
