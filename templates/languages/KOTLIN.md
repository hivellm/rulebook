<!-- KOTLIN:START -->
# Kotlin Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence (Gradle):
./gradlew ktlintCheck     # Format check
./gradlew detekt          # Linting
./gradlew test            # All tests (100% pass)
./gradlew build           # Build verification
./gradlew koverVerify     # Coverage (95%+ required)

# Security audit:
./gradlew dependencyCheckAnalyze  # Vulnerability scan
./gradlew dependencyUpdates       # Check outdated deps
```

## Kotlin Configuration

**CRITICAL**: Use Kotlin 2.0+ with strict null safety.

- **Version**: Kotlin 2.0+
- **JVM Target**: 17+
- **Language Features**: All enabled
- **Compiler**: K2 compiler
- **Null Safety**: Strict

### build.gradle.kts Requirements

```kotlin
plugins {
    kotlin("jvm") version "2.0.0"
    id("org.jetbrains.dokka") version "1.9.20"
    id("io.gitlab.arturbosch.detekt") version "1.23.5"
    id("org.jlleitschuh.gradle.ktlint") version "12.1.0"
    `maven-publish`
    signing
}

group = "io.github.your-username"
version = "1.0.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation(kotlin("stdlib"))
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
    
    testImplementation(kotlin("test"))
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.0")
    testImplementation("io.mockk:mockk:1.13.9")
}

kotlin {
    jvmToolchain(17)
    
    compilerOptions {
        freeCompilerArgs.add("-Xjsr305=strict")
        freeCompilerArgs.add("-Xcontext-receivers")
        allWarningsAsErrors.set(true)
    }
}

tasks.test {
    useJUnitPlatform()
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs = listOf(
            "-Xjsr305=strict",
            "-Xcontext-receivers"
        )
        allWarningsAsErrors = true
    }
}

detekt {
    config.setFrom(files("$rootDir/detekt.yml"))
    buildUponDefaultConfig = true
    allRules = false
}

ktlint {
    version.set("1.1.0")
    android.set(false)
    ignoreFailures.set(false)
}
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow - use Check, not Format!)
./gradlew ktlintCheck

# 2. Lint (matches workflow)
./gradlew detekt

# 3. Build (MUST pass with no warnings - matches workflow)
./gradlew build -x test

# 4. Run all tests (MUST pass 100% - matches workflow)
./gradlew test

# 5. Check coverage (MUST meet threshold)
./gradlew koverVerify

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- CI/CD failures happen when local commands differ from workflows
- Example: Using `ktlintFormat` locally but `ktlintCheck` in CI = failure
- Example: Using `koverHtmlReport` locally but `koverVerify` in CI = coverage failures

### Code Style

Use ktlint with `.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_size = 4
indent_style = space
insert_final_newline = true
max_line_length = 120
tab_width = 4

[*.{kt,kts}]
ij_kotlin_allow_trailing_comma = true
ij_kotlin_allow_trailing_comma_on_call_site = true

# Imports
ij_kotlin_imports_layout = *,java.**,javax.**,kotlin.**,^

# Wrapping
ij_kotlin_line_break_after_multiline_when_entry = true
ij_kotlin_wrap_expression_body_functions = 1
ij_kotlin_wrap_first_method_in_call_chain = false

# Spacing
ij_kotlin_space_after_type_colon = true
ij_kotlin_space_before_type_colon = false
```

### Static Analysis

Use Detekt. Configuration in `detekt.yml`:

```yaml
build:
  maxIssues: 0
  weights:
    complexity: 2
    LongParameterList: 1
    style: 1
    comments: 1

complexity:
  active: true
  ComplexMethod:
    threshold: 15
  LongMethod:
    threshold: 60
  LongParameterList:
    functionThreshold: 6
  TooManyFunctions:
    thresholdInFiles: 15

naming:
  active: true
  FunctionNaming:
    active: true
  ClassNaming:
    active: true
  VariableNaming:
    active: true

style:
  active: true
  MagicNumber:
    active: true
  ReturnCount:
    max: 3

coroutines:
  active: true
  GlobalCoroutineUsage:
    active: true
  SuspendFunWithFlowReturnType:
    active: true
```

### Testing

- **Framework**: JUnit 5 (Jupiter)
- **Mocking**: MockK
- **Coroutines**: kotlinx-coroutines-test
- **Coverage**: Kover
- **Coverage Threshold**: 95%+

Example test:

```kotlin
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertEquals

class DataProcessorTest {
    
    @Test
    fun `process valid input returns uppercase`() {
        val processor = DataProcessor()
        val result = processor.process("hello")
        
        assertEquals("HELLO", result)
    }
    
    @Test
    fun `process empty input throws exception`() {
        val processor = DataProcessor()
        
        assertThrows<IllegalArgumentException> {
            processor.process("")
        }
    }
    
    @Test
    fun `processAsync works correctly`() = runTest {
        val processor = DataProcessor()
        val result = processor.processAsync("test")
        
        assertEquals("TEST", result)
    }
    
    @Test
    fun `test with mocking`() {
        val repository = mockk<UserRepository>()
        every { repository.findById(1) } returns User(1, "John")
        
        val service = UserService(repository)
        val user = service.getUser(1)
        
        assertEquals("John", user?.name)
        verify { repository.findById(1) }
    }
}
```

### Null Safety

- Use non-null types by default
- Use `?` for nullable types
- Use safe calls `?.` and Elvis operator `?:`
- Avoid `!!` operator (use only when absolutely necessary)

Example:

```kotlin
data class User(
    val id: Int,
    val name: String,
    val email: String?,
    val phone: String? = null
)

class UserService(private val repository: UserRepository) {
    
    fun findUser(id: Int): User? {
        return repository.findById(id)
    }
    
    fun getUserName(id: Int): String {
        val user = findUser(id) ?: throw UserNotFoundException(id)
        return user.name
    }
    
    fun getUserEmail(id: Int): String {
        val user = findUser(id) ?: return "unknown@example.com"
        return user.email ?: "no-email@example.com"
    }
    
    fun processUsers(ids: List<Int>): List<String> {
        return ids.mapNotNull { id ->
            findUser(id)?.name
        }
    }
}
```

### Coroutines

- Use structured concurrency
- Prefer `suspend` functions over callbacks
- Use `Flow` for reactive streams
- Handle cancellation properly

Example:

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

class DataService(private val api: ApiClient) {
    
    suspend fun fetchData(id: Int): Result<Data> = withContext(Dispatchers.IO) {
        try {
            val data = api.getData(id)
            Result.success(data)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    fun observeData(id: Int): Flow<Data> = flow {
        while (currentCoroutineContext().isActive) {
            val data = api.getData(id)
            emit(data)
            delay(1000)
        }
    }.flowOn(Dispatchers.IO)
    
    suspend fun fetchMultiple(ids: List<Int>): List<Data> = coroutineScope {
        ids.map { id ->
            async { fetchData(id).getOrNull() }
        }.awaitAll().filterNotNull()
    }
}
```

### Data Classes & Sealed Classes

- Use `data class` for value objects
- Use `sealed class`/`sealed interface` for restricted hierarchies
- Use `value class` for single-property wrappers

Example:

```kotlin
// Data class for DTOs
data class User(
    val id: Int,
    val name: String,
    val email: String
)

// Sealed hierarchy for results
sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>
    data class Error(val exception: Exception) : Result<Nothing>
    data object Loading : Result<Nothing>
}

// Value class for type safety
@JvmInline
value class UserId(val value: Int)

@JvmInline
value class Email(val value: String) {
    init {
        require(value.contains("@")) { "Invalid email format" }
    }
}
```

### Documentation

- Use KDoc for documentation
- Document all public APIs
- Include examples with `@sample`

Example:

```kotlin
/**
 * A processor that transforms input data.
 *
 * This class provides methods for processing strings synchronously and asynchronously.
 * All processing is done in a thread-safe manner.
 *
 * @property config Configuration for the processor
 * @constructor Creates a processor with the given configuration
 */
class DataProcessor(private val config: ProcessorConfig = ProcessorConfig()) {
    
    /**
     * Processes the input string synchronously.
     *
     * @param input The string to process. Must not be empty.
     * @return The processed string in uppercase.
     * @throws IllegalArgumentException if [input] is empty.
     * @sample samples.DataProcessorSamples.processExample
     */
    fun process(input: String): String {
        require(input.isNotEmpty()) { "Input cannot be empty" }
        return input.uppercase()
    }
    
    /**
     * Processes the input string asynchronously.
     *
     * This is a suspending function that can be called from a coroutine.
     *
     * @param input The string to process.
     * @return The processed string in uppercase.
     */
    suspend fun processAsync(input: String): String = withContext(Dispatchers.Default) {
        process(input)
    }
}

// Sample code for documentation
object samples {
    object DataProcessorSamples {
        fun processExample() {
            val processor = DataProcessor()
            val result = processor.process("hello")
            println(result) // Prints: HELLO
        }
    }
}
```

## Project Structure

```
project/
├── build.gradle.kts        # Gradle build configuration
├── settings.gradle.kts     # Gradle settings
├── detekt.yml              # Detekt configuration
├── .editorconfig           # EditorConfig for ktlint
├── README.md               # Project overview (allowed in root)
├── CHANGELOG.md            # Version history (allowed in root)
├── LICENSE                 # Project license (allowed in root)
├── src/
│   ├── main/
│   │   └── kotlin/
│   │       └── com/yourorg/yourproject/
│   │           └── YourClass.kt
│   └── test/
│       └── kotlin/
│           └── com/yourorg/yourproject/
│               └── YourClassTest.kt
└── docs/                   # Project documentation
```

## CI/CD Requirements

Must include GitHub Actions workflows for:

1. **Testing** (`kotlin-test.yml`):
   - Test on ubuntu-latest, windows-latest
   - Test on Java 17, 21
   - Upload coverage reports

2. **Linting** (`kotlin-lint.yml`):
   - Detekt: `./gradlew detekt`
   - ktlint: `./gradlew ktlintCheck`
   - Build with warnings as errors

## Package Publication

### Publishing to Maven Central

Same process as Java (see JAVA.md), but with Kotlin-specific configuration.

**Publishing Checklist:**

- ✅ All tests passing
- ✅ Detekt passes
- ✅ ktlint passes
- ✅ Build succeeds with warnings as errors
- ✅ Version updated in build.gradle.kts
- ✅ CHANGELOG.md updated
- ✅ README.md up to date
- ✅ LICENSE file present
- ✅ Dokka documentation generated
- ✅ Artifacts signed with GPG

**Dokka Documentation:**

```kotlin
tasks.dokkaHtml.configure {
    outputDirectory.set(buildDir.resolve("dokka"))
}
```

<!-- KOTLIN:END -->

