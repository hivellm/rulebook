<!-- SCALA:START -->
# Scala rules

## Non-negotiables

1. Scala 3.3+, sbt 1.9+ (or Mill 0.11+); scalafmt with `runner.dialect = scala3`.
2. Fatal warnings on: `-Werror`/`-Xfatal-warnings`, `-Wunused:all`, `-Wvalue-discard`.
3. CI parity: run the *check* variants locally — `scalafmtCheckAll scalafmtSbtCheck` and `scalafixAll --check`, never `scalafmtAll`/`scalafixAll` (which apply fixes and silently diverge from CI).
4. Scalafix `DisableSyntax`: no `var`, no `null`, no `return`, no `throw`, no `asInstanceOf`/`isInstanceOf`, no `while`.
5. `Option` instead of null; `sealed trait` ADTs + exhaustive pattern matching.
6. Coverage gate via sbt-scoverage: `coverageFailOnMinimum := true` (≥80%).

## Conventions

- Immutable data via `case class`; no mutable state in classes; pure functions, side effects at the edges.
- Errors as values (ADT like `Success`/`Failure` or `Either`), not exceptions.
- Compile-time config in `build.sbt` with `ThisBuild /` scoping; plugins: sbt-scalafmt, sbt-scalafix, sbt-scoverage, sbt-wartremover.
- `.scalafmt.conf` pins its own `version`; `maxColumn = 100`; rewrite rules `RedundantBraces`, `RedundantParens`, `SortModifiers`.
- for-comprehensions for monadic pipelines; `getOrElse` over `.get`.

## Testing

- ScalaTest 3.2+ (AnyFlatSpec + Matchers) or MUnit; tests in `src/test/scala`.
- Property-based tests with ScalaCheck (`scalatestplus scalacheck-1-17`).
- Coverage run is separate: `sbt clean coverage test coverageReport coverageAggregate` (instrumented build — never publish it).
- `Test / testOptions += Tests.Argument("-oDF")` for full stack traces.

## Build & tooling

- Order per iteration: format check → scalafix check → `sbt clean compile Test/compile` → `wartremoverCheck` → `sbt test` → coverage.
- `sbt dependencyCheck` for vulnerabilities, `sbt dependencyUpdates` for stale deps.
- Maven Central: `sbt publishSigned` then `sonatypeBundleRelease` (credentials in `~/.sbt/1.0/sonatype.sbt`).
<!-- SCALA:END -->
