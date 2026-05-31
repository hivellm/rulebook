import type { LanguageDetection, LibraryId } from '../../types.js';

/**
 * The language a library belongs to. Reuses the language union from
 * {@link LanguageDetection} so prompts can group libraries under their language.
 */
export type LibraryLanguage = LanguageDetection['language'];

/**
 * Detection signals for a library, keyed by package manager. A match on any
 * declared signal counts as a detection. `files` lists marker paths (relative to
 * the project root) that also indicate the library's presence.
 */
export interface LibrarySignals {
  npm?: string[];
  cargo?: string[];
  pip?: string[];
  gomod?: string[];
  files?: string[];
}

/**
 * A registry entry describing how to detect a library and which rule template to
 * emit for it. Adding a library to Rulebook is a single entry plus a template
 * file — no detector or generator code changes required.
 */
export interface LibraryDef {
  id: LibraryId;
  label: string;
  language: LibraryLanguage;
  detect: LibrarySignals;
  /** Path under `templates/libraries/` relative to the templates root. */
  template: string;
  /** Optional globs for a path-scoped `.claude/rules/<id>.md` file. */
  rulePaths?: string[];
}

/**
 * The library catalog. Each entry is independent; order is irrelevant because
 * detection sorts by confidence. An npm pattern ending in `*` matches by prefix
 * (e.g. `@radix-ui/*`).
 */
export const LIBRARY_REGISTRY: LibraryDef[] = [
  // ── TypeScript / JavaScript ────────────────────────────────────────────────
  {
    id: 'react',
    label: 'React',
    language: 'typescript',
    detect: { npm: ['react'] },
    template: 'typescript/REACT.md',
    rulePaths: ['**/*.tsx', '**/*.jsx'],
  },
  {
    id: 'next',
    label: 'Next.js',
    language: 'typescript',
    detect: { npm: ['next'], files: ['next.config.js', 'next.config.mjs', 'next.config.ts'] },
    template: 'typescript/NEXT.md',
    rulePaths: ['app/**', 'pages/**', 'next.config.*'],
  },
  {
    id: 'vue',
    label: 'Vue',
    language: 'typescript',
    detect: { npm: ['vue'] },
    template: 'typescript/VUE.md',
    rulePaths: ['**/*.vue'],
  },
  {
    id: 'svelte',
    label: 'Svelte',
    language: 'typescript',
    detect: { npm: ['svelte'] },
    template: 'typescript/SVELTE.md',
    rulePaths: ['**/*.svelte'],
  },
  {
    id: 'angular',
    label: 'Angular',
    language: 'typescript',
    detect: { npm: ['@angular/*'] },
    template: 'typescript/ANGULAR.md',
  },
  {
    id: 'tailwind',
    label: 'Tailwind CSS',
    language: 'typescript',
    detect: {
      npm: ['tailwindcss'],
      files: ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.cjs'],
    },
    template: 'typescript/TAILWIND.md',
    rulePaths: ['tailwind.config.*', '**/*.css'],
  },
  {
    id: 'heroui',
    label: 'HeroUI',
    language: 'typescript',
    detect: { npm: ['@heroui/*', '@nextui-org/*'] },
    template: 'typescript/HEROUI.md',
  },
  {
    id: 'radix',
    label: 'Radix UI',
    language: 'typescript',
    detect: { npm: ['@radix-ui/*'] },
    template: 'typescript/RADIX.md',
  },
  {
    id: 'shadcn',
    label: 'shadcn/ui',
    language: 'typescript',
    detect: { files: ['components.json'] },
    template: 'typescript/SHADCN.md',
  },
  {
    id: 'prisma',
    label: 'Prisma',
    language: 'typescript',
    detect: { npm: ['prisma', '@prisma/client'], files: ['prisma/schema.prisma'] },
    template: 'typescript/PRISMA.md',
    rulePaths: ['**/*.prisma', 'prisma/**'],
  },
  {
    id: 'drizzle',
    label: 'Drizzle ORM',
    language: 'typescript',
    detect: { npm: ['drizzle-orm'], files: ['drizzle.config.ts', 'drizzle.config.js'] },
    template: 'typescript/DRIZZLE.md',
  },
  {
    id: 'trpc',
    label: 'tRPC',
    language: 'typescript',
    detect: { npm: ['@trpc/server', '@trpc/client'] },
    template: 'typescript/TRPC.md',
  },
  {
    id: 'zod',
    label: 'Zod',
    language: 'typescript',
    detect: { npm: ['zod'] },
    template: 'typescript/ZOD.md',
  },
  {
    id: 'express',
    label: 'Express',
    language: 'typescript',
    detect: { npm: ['express'] },
    template: 'typescript/EXPRESS.md',
  },
  {
    id: 'nestjs',
    label: 'NestJS',
    language: 'typescript',
    detect: { npm: ['@nestjs/core'] },
    template: 'typescript/NESTJS.md',
  },
  {
    id: 'vitest',
    label: 'Vitest',
    language: 'typescript',
    detect: { npm: ['vitest'], files: ['vitest.config.ts', 'vitest.config.js'] },
    template: 'typescript/VITEST.md',
    rulePaths: ['**/*.test.ts', '**/*.spec.ts'],
  },
  {
    id: 'jest',
    label: 'Jest',
    language: 'typescript',
    detect: { npm: ['jest'], files: ['jest.config.js', 'jest.config.ts'] },
    template: 'typescript/JEST.md',
  },
  // ── Python ──────────────────────────────────────────────────────────────────
  {
    id: 'django',
    label: 'Django',
    language: 'python',
    detect: { pip: ['django'], files: ['manage.py'] },
    template: 'python/DJANGO.md',
  },
  {
    id: 'fastapi',
    label: 'FastAPI',
    language: 'python',
    detect: { pip: ['fastapi'] },
    template: 'python/FASTAPI.md',
  },
  {
    id: 'flask',
    label: 'Flask',
    language: 'python',
    detect: { pip: ['flask'] },
    template: 'python/FLASK.md',
  },
  {
    id: 'sqlalchemy',
    label: 'SQLAlchemy',
    language: 'python',
    detect: { pip: ['sqlalchemy'] },
    template: 'python/SQLALCHEMY.md',
  },
  {
    id: 'pydantic',
    label: 'Pydantic',
    language: 'python',
    detect: { pip: ['pydantic'] },
    template: 'python/PYDANTIC.md',
  },
  {
    id: 'pytest',
    label: 'pytest',
    language: 'python',
    detect: { pip: ['pytest'], files: ['pytest.ini', 'conftest.py'] },
    template: 'python/PYTEST.md',
  },
  // ── Rust ──────────────────────────────────────────────────────────────────
  {
    id: 'axum',
    label: 'Axum',
    language: 'rust',
    detect: { cargo: ['axum'] },
    template: 'rust/AXUM.md',
  },
  {
    id: 'actix',
    label: 'Actix Web',
    language: 'rust',
    detect: { cargo: ['actix-web'] },
    template: 'rust/ACTIX.md',
  },
  {
    id: 'tokio',
    label: 'Tokio',
    language: 'rust',
    detect: { cargo: ['tokio'] },
    template: 'rust/TOKIO.md',
  },
  {
    id: 'serde',
    label: 'Serde',
    language: 'rust',
    detect: { cargo: ['serde'] },
    template: 'rust/SERDE.md',
  },
  {
    id: 'sqlx',
    label: 'SQLx',
    language: 'rust',
    detect: { cargo: ['sqlx'] },
    template: 'rust/SQLX.md',
  },
  // ── Go ──────────────────────────────────────────────────────────────────────
  {
    id: 'gin',
    label: 'Gin',
    language: 'go',
    detect: { gomod: ['github.com/gin-gonic/gin'] },
    template: 'go/GIN.md',
  },
  {
    id: 'echo',
    label: 'Echo',
    language: 'go',
    detect: { gomod: ['github.com/labstack/echo'] },
    template: 'go/ECHO.md',
  },
  {
    id: 'gorm',
    label: 'GORM',
    language: 'go',
    detect: { gomod: ['gorm.io/gorm'] },
    template: 'go/GORM.md',
  },
];
