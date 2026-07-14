<!-- SQL:START -->
# SQL rules

## Non-negotiables

1. SQLFluff lint clean and `sqlfluff format --check` before commit; CI runs the check variant — never rely on local `sqlfluff fix` alone.
2. All DDL and migrations under version control; validate with `flyway validate` or `liquibase validate` before commit.
3. Migrations are idempotent: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, guarded `ALTER TABLE ADD COLUMN` via `DO $$ ... information_schema.columns` check.
4. Never edit an applied migration — add a new one.
5. Database tests wrap in `BEGIN; ... ROLLBACK;` so they leave no state.

## Conventions

- `.sqlfluff` pins the dialect (`dialect = postgres` etc.) and templater; commit it.
- Casing: keywords and functions UPPER, identifiers lower.
- Max line length 100; indented joins and `USING`/`ON` clauses.
- Timestamps as `TIMESTAMP WITH TIME ZONE`, surrogate keys `BIGSERIAL`/identity.
- Sequentially numbered migration files (`001_create_users.sql`); one logical change per migration.

## Testing

- pgTAP (PostgreSQL), tSQLt (SQL Server), utPLSQL (Oracle).
- pgTAP pattern: `SELECT plan(n);` → assertions (`has_table`, `col_is_pk`, `is(fn(...), expected, 'msg')`) → `SELECT * FROM finish();` inside a rolled-back transaction.
- Test schema objects (tables, constraints, indexes) and function behavior, not just queries.
- Run suites against a disposable test database (`psql -d testdb -f tests/test_suite.sql`).

## Build & tooling

- Order per iteration: `sqlfluff format --check` → `sqlfluff lint` → run test suite → migration validate.
- Local commands MUST match GitHub Actions workflows exactly.
- Migration tool (Flyway or Liquibase) is the only path to schema change — no ad-hoc DDL in production.
<!-- SQL:END -->
