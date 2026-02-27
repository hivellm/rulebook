<!-- NEXTJS:START -->
# Next.js Framework Rules

**Language**: TypeScript, JavaScript  
**Version**: Next.js 14+ (App Router)

## Setup & Configuration

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['your-domain.com'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

export default nextConfig
```

## Quality Gates

```bash
# Type check
npm run type-check  # or: tsc --noEmit

# Lint
npm run lint        # Next.js ESLint

# Format
npx prettier --check "**/*.{ts,tsx}"

# Tests
npm test            # Vitest or Jest

# Build
npm run build       # Must succeed

# Check bundle size
npm run build && npx @next/bundle-analyzer
```

## Best Practices

✅ **DO:**
- Use App Router (app/) for new projects
- Implement Server Components by default
- Use Client Components ('use client') only when needed
- Optimize images with next/image
- Use dynamic imports for code splitting
- Implement proper metadata/SEO
- Use Server Actions for mutations
- Enable React Strict Mode

❌ **DON'T:**
- Use getServerSideProps/getStaticProps in App Router
- Fetch on client when server fetch is better
- Skip image optimization
- Ignore bundle size
- Use 'use client' everywhere
- Hardcode API URLs
- Skip error boundaries

## Project Structure (App Router)

```
app/
├── layout.tsx         # Root layout
├── page.tsx           # Home page
├── (routes)/
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── api/
│       └── users/
│           └── route.ts
├── components/
├── lib/
└── types/
```

## Server vs Client Components

```typescript
// Server Component (default)
async function ServerComponent() {
  const data = await fetch('https://api.example.com/data')
  return <div>{data}</div>
}

// Client Component
'use client'
import { useState } from 'react'

function ClientComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

## Route Handlers (API Routes)

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get('id')
  
  return NextResponse.json({ id })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // Handle POST
  return NextResponse.json({ success: true })
}
```

<!-- NEXTJS:END -->

