<!-- SCALA:START -->
# Scala Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
sbt scalafmtCheckAll      # Format check
sbt scalafix --check      # Linting
sbt compile               # Compilation check
sbt test                  # All tests (100% pass)
sbt coverage              # Coverage (95%+ required)

# Security audit:
sbt dependencyCheck       # Vulnerability scan
sbt dependencyUpdates     # Check outdated deps
```

## Scala Configuration

**CRITICAL**: Use Scala 3.x with modern tooling and strict compiler flags.

- **Version**: Scala 3.3+
- **Build Tool**: sbt 1.9+ or Mill 0.11+
- **Formatting**: scalafmt
- **Linting**: scalafix + Wartremover
- **Testing**: ScalaTest, MUnit, or Specs2

### build.sbt Requirements

```scala
ThisBuild / organization := "com.yourcompany"
ThisBuild / scalaVersion := "3.3.1"
ThisBuild / version      := "0.1.0-SNAPSHOT"

lazy val root = (project in file("."))
  .settings(
    name := "your-project",
    
    // Compiler options
    scalacOptions ++= Seq(
      "-encoding", "UTF-8",
      "-feature",
      "-language:implicitConversions",
      "-unchecked",
      "-Werror",
      "-Wunused:all",
      "-Wvalue-discard",
      "-Xfatal-warnings"
    ),
    
    // Dependencies
    libraryDependencies ++= Seq(
      "org.scala-lang" %% "scala3-library" % scalaVersion.value,
      
      // Test dependencies
      "org.scalatest" %% "scalatest" % "3.2.17" % Test,
      "org.scalatestplus" %% "scalacheck-1-17" % "3.2.17.0" % Test
    ),
    
    // Test configuration
    Test / testOptions += Tests.Argument("-oDF"),
    Test / parallelExecution := false,
    
    // Coverage
    coverageMinimumStmtTotal := 80,
    coverageFailOnMinimum := true,
    coverageHighlighting := true
  )

// Plugins
addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.5.2")
addSbtPlugin("ch.epfl.scala" % "sbt-scalafix" % "0.11.1")
addSbtPlugin("org.scoverage" % "sbt-scoverage" % "2.0.9")
addSbtPlugin("org.wartremover" % "sbt-wartremover" % "3.1.6")
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist - sbt (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow - use Check, not format!)
sbt scalafmtCheckAll scalafmtSbtCheck

# 2. Lint with scalafix (matches workflow - use --check!)
sbt "scalafixAll --check"

# 3. Compile with fatal warnings (matches workflow)
sbt clean compile Test/compile

# 4. Run Wartremover (matches workflow)
sbt wartremoverCheck

# 5. Run all tests (MUST pass 100% - matches workflow)
sbt test

# 6. Check coverage (MUST meet threshold - matches workflow)
sbt clean coverage test coverageReport
sbt coverageAggregate

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- Running different commands locally than in CI causes "works on my machine" failures
- CI/CD workflows will fail if commands don't match
- Example: Using `scalafmtAll` locally but `scalafmtCheckAll` in CI = failure
- Example: Using `scalafixAll` (applies fixes) locally but `scalafixAll --check` in CI = failure
- Example: Missing `wartremoverCheck` locally = CI catches code quality issues

### Formatting with scalafmt

- Configuration in `.scalafmt.conf`
- Consistent formatting across project
- Check in CI (don't auto-format)

Example `.scalafmt.conf`:
```conf
version = "3.7.17"
runner.dialect = scala3
maxColumn = 100
align.preset = more
align.multiline = false
assumeStandardLibraryStripMargin = true
docstrings.style = Asterisk
lineEndings = unix
includeCurlyBraceInSelectChains = false
danglingParentheses.preset = true
spaces.inImportCurlyBraces = false
optIn.annotationNewlines = true
rewrite.rules = [
  RedundantBraces,
  RedundantParens,
  PreferCurlyFors,
  SortModifiers
]
```

### Linting with Scalafix

- Configuration in `.scalafix.conf`
- Enforce code quality rules
- Prevent common bugs

Example `.scalafix.conf`:
```conf
rules = [
  DisableSyntax,
  LeakingImplicitClassVal,
  NoAutoTupling,
  NoValInForComprehension,
  ProcedureSyntax,
  RemoveUnused
]

DisableSyntax.noVars = true
DisableSyntax.noThrows = true
DisableSyntax.noNulls = true
DisableSyntax.noReturns = true
DisableSyntax.noWhileLoops = true
DisableSyntax.noAsInstanceOf = true
DisableSyntax.noIsInstanceOf = true
DisableSyntax.noXml = true
```

### Testing

- **Framework**: ScalaTest (recommended), MUnit, or Specs2
- **Location**: `/src/test/scala` directory
- **Coverage**: sbt-scoverage (80%+ threshold)
- **Property Testing**: ScalaCheck

Example ScalaTest:
```scala
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers
import org.scalatest.BeforeAndAfterEach

class DataProcessorSpec extends AnyFlatSpec with Matchers with BeforeAndAfterEach {
  
  var processor: DataProcessor = _
  
  override def beforeEach(): Unit = {
    processor = new DataProcessor(threshold = 0.5)
  }
  
  override def afterEach(): Unit = {
    // Cleanup
  }
  
  "DataProcessor" should "process valid input correctly" in {
    val input = List(1, 2, 3, 4, 5)
    val result = processor.process(input)
    
    result should not be empty
    result.length should be > 0
  }
  
  it should "handle empty input" in {
    val result = processor.process(List.empty)
    result shouldBe empty
  }
  
  it should "throw exception on null input" in {
    assertThrows[IllegalArgumentException] {
      processor.process(null)
    }
  }
}
```

Example with MUnit:
```scala
import munit.FunSuite

class DataProcessorSuite extends FunSuite {
  
  test("process should handle valid input") {
    val processor = new DataProcessor(threshold = 0.5)
    val input = List(1, 2, 3)
    val result = processor.process(input)
    
    assert(result.nonEmpty)
    assertEquals(result.length, 3)
  }
  
  test("process should handle empty input") {
    val processor = new DataProcessor(threshold = 0.5)
    val result = processor.process(List.empty)
    
    assert(result.isEmpty)
  }
}
```

## Type Safety

- Use case classes for immutable data
- Leverage sealed traits for ADTs
- Use Option instead of null
- Pattern matching for control flow

Example:
```scala
// Sealed trait for ADT
sealed trait Result[+A]
case class Success[A](value: A) extends Result[A]
case class Failure(error: String) extends Result[Nothing]

// Case class for data
case class User(
  id: String,
  name: String,
  email: Option[String] = None,
  age: Option[Int] = None
)

// Pattern matching
def handleResult[A](result: Result[A]): String = result match {
  case Success(value) => s"Got value: $value"
  case Failure(error) => s"Error: $error"
}

// Option handling
def getUserEmail(user: User): String = 
  user.email.getOrElse("no-email@example.com")
```

## Functional Programming

- Prefer immutability
- Use pure functions
- Avoid side effects
- Use for-comprehensions for monadic operations

Example:
```scala
// ✅ GOOD: Immutable, pure functions
class DataProcessor(threshold: Double) {
  def process(data: List[Int]): List[Int] = 
    data.filter(_ > threshold)
  
  def transform(data: List[Int]): List[String] =
    data.map(x => s"Value: $x")
  
  def pipeline(data: List[Int]): List[String] = for {
    filtered <- Some(process(data))
    transformed <- Some(transform(filtered))
  } yield transformed
}

// ❌ BAD: Mutable, impure
class DataProcessor(var threshold: Double) {
  var results: List[Int] = List.empty  // Mutable state!
  
  def process(data: List[Int]): Unit = {  // Side effect!
    results = data.filter(_ > threshold)
    println(results)  // More side effects!
  }
}
```

## CI/CD Requirements

Must include GitHub Actions workflows:

1. **Testing** (`scala-test.yml`):
   - Test on ubuntu-latest
   - Scala versions: 3.3.x
   - sbt test with coverage

2. **Linting** (`scala-lint.yml`):
   - scalafmtCheckAll
   - scalafixAll --check
   - wartremoverCheck

3. **Build** (`scala-build.yml`):
   - sbt compile
   - sbt package
   - Verify artifacts

## Publishing

### To Maven Central

```bash
# 1. Configure credentials in ~/.sbt/1.0/sonatype.sbt
# 2. Update version
# 3. Run quality checks
sbt clean scalafmtCheckAll test

# 4. Publish
sbt publishSigned
sbt sonatypeBundleRelease
```

<!-- SCALA:END -->
