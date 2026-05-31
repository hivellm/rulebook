<!-- GORM:START -->
# GORM Rules

## Conventions
- Always check `result.Error` after every GORM call; use `errors.Is(result.Error, gorm.ErrRecordNotFound)` to distinguish not-found from other errors.
- Open the database connection once at application startup and inject `*gorm.DB` via dependency injection — never open connections per request.
- Use `db.WithContext(ctx)` on every query so timeouts and cancellations from the request lifecycle propagate to the database driver.
- Prefer `db.Model(&User{}).Where(...).Updates(map[string]interface{}{...})` for partial updates — struct-based `Updates` silently skips zero values.
- Define associations explicitly with struct tags (`gorm:"foreignKey:UserID"`) and load them deliberately with `Preload` — avoid relying on auto-preload behaviour.
- Run `db.AutoMigrate(&Model{})` only in development or dedicated migration tooling; in production use versioned SQL migration files (e.g., golang-migrate).
- Use `db.Transaction(func(tx *gorm.DB) error { ... })` for multi-statement operations to ensure atomicity.

## Avoid
- Do not use `db.First` without a `WHERE` clause — it silently returns the row with the lowest primary key, which is almost never correct.
- Do not pass a pointer to a slice directly to `db.Find` without a `WHERE`; without conditions it performs a full table scan.
- Avoid using `gorm.Model` in API response structs — it exposes `DeletedAt` and internal timestamps to callers; use a separate DTO.
- Do not share a single `*gorm.DB` instance that has scopes or conditions already applied across goroutines — clone it with `db.Session(&gorm.Session{})` first.
<!-- GORM:END -->
