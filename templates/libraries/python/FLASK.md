<!-- FLASK:START -->
# Flask Rules

## Conventions
- Use the Application Factory pattern (`create_app()`) to enable multiple app instances and clean testing.
- Register routes via `Blueprint`s grouped by feature; import and register them in `create_app()`.
- Use `flask.g` for request-scoped resources (e.g., DB connections); tear them down with `@app.teardown_appcontext`.
- Access configuration from `app.config` populated via `app.config.from_object()` or environment variables; never hard-code secrets.
- Use `flask.abort(status_code)` or return `(response, status_code)` tuples for error responses; register error handlers with `@app.errorhandler`.
- Prefer `flask.current_app` and `flask.request` proxy objects inside request context rather than passing `app` around.

## Avoid
- Creating the `Flask` app at module level in large projects — it prevents testing with different configs.
- Using mutable default arguments in view functions or blueprint registration.
- Storing request-scoped state in module-level globals instead of `flask.g`.
- Mixing `jsonify()` and raw `dict` returns inconsistently — pick one style per project.
<!-- FLASK:END -->
