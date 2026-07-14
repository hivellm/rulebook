<!-- KOTLIN:START -->
# Kotlin rules

## Non-negotiables

- Kotlin 2.0+ (K2 compiler), JVM toolchain 17+ via `kotlin { jvmToolchain(17) }`.
- `allWarningsAsErrors = true` and `-Xjsr305=strict` (strict nullability for Java interop annotations).
- ktlint gate is `./gradlew ktlintCheck` — running `ktlintFormat` locally while CI runs `ktlintCheck` still fails on drift; run Check.
- Detekt (`./gradlew detekt`) with `maxIssues: 0`, `buildUponDefaultConfig = true`, config in `detekt.yml`.
- Coverage gate is `./gradlew koverVerify` (≥95%) — `koverHtmlReport` alone verifies nothing.
- No `!!` outside tests; prefer `?.`, `?:`, `requireNotNull` with a message.

## Conventions

- ktlint style lives in `.editorconfig` (max_line_length 120, trailing commas allowed); never fight it manually.
- `data class` for values, `sealed interface`/`sealed class` for restricted hierarchies, `@JvmInline value class` for single-property wrappers with `init { require(...) }` validation.
- Coroutines: structured concurrency only — `coroutineScope { async {} }.awaitAll()`, no `GlobalScope` (Detekt `GlobalCoroutineUsage` enforces); `Flow` for streams with `flowOn(Dispatchers.IO)`.
- `suspend` functions return values or `Result<T>`; do not return `Flow` from a `suspend fun` (Detekt rule).
- KDoc on public APIs; `@sample` for examples; Dokka for generated docs.
- Standard Maven layout: `src/main/kotlin`, `src/test/kotlin`.

## Testing

- JUnit 5 (Jupiter) via `useJUnitPlatform()`; MockK for mocks (`every`/`verify`), `kotlinx-coroutines-test` `runTest` for suspend code.
- Backtick test names: `` fun `process empty input throws exception`() ``.
- Coverage with Kover; threshold enforced by `koverVerify`, not by eyeballing reports.

## Build & tooling

- Gradle Kotlin DSL (`build.gradle.kts`); plugin stack: kotlin-jvm, dokka, detekt, ktlint (org.jlleitschuh), maven-publish + signing for releases.
- Dependency audits: `./gradlew dependencyCheckAnalyze` (vulnerabilities) and `dependencyUpdates` (outdated).
- CI matrix: Java 17 and 21, ubuntu + windows; build with warnings-as-errors.
- Maven Central publishing requires GPG-signed artifacts and Dokka docs.
<!-- KOTLIN:END -->
