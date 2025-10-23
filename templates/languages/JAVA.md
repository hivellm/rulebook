<!-- JAVA:START -->
# Java Project Rules

## Java Version

**CRITICAL**: Use Java 17 LTS or Java 21 LTS for modern features and long-term support.

- **Minimum Version**: Java 17 LTS
- **Recommended**: Java 21 LTS
- **Build Tool**: Maven or Gradle

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order:

```bash
# For Maven projects:

# 1. Format code
mvn spotless:apply

# 2. Lint and static analysis
mvn checkstyle:check
mvn pmd:check

# 3. Run all tests (MUST pass 100%)
mvn test

# 4. Check coverage (MUST meet threshold)
mvn jacoco:report
mvn jacoco:check

# For Gradle projects:

# 1. Format code
./gradlew spotlessApply

# 2. Lint and check
./gradlew checkstyleMain checkstyleTest

# 3. Run tests
./gradlew test

# 4. Check coverage
./gradlew jacocoTestReport jacocoTestCoverageVerification
```

**If ANY of these fail, you MUST fix the issues before committing.**

### Formatting

- Use Spotless or Google Java Format
- Consistent formatting across entire project
- Format before committing

Maven configuration (`pom.xml`):
```xml
<plugin>
    <groupId>com.diffplug.spotless</groupId>
    <artifactId>spotless-maven-plugin</artifactId>
    <version>2.40.0</version>
    <configuration>
        <java>
            <googleJavaFormat>
                <version>1.17.0</version>
                <style>GOOGLE</style>
            </googleJavaFormat>
        </java>
    </configuration>
</plugin>
```

Gradle configuration (`build.gradle`):
```gradle
plugins {
    id 'com.diffplug.spotless' version '6.23.0'
}

spotless {
    java {
        googleJavaFormat('1.17.0').aosp()
    }
}
```

### Linting

- Use Checkstyle for style checks
- Use PMD for code quality
- Use SpotBugs for bug detection
- Configure in `checkstyle.xml`, `pmd.xml`

### Testing

- **Framework**: JUnit 5 (JUnit Jupiter)
- **Location**: `src/test/java`
- **Coverage**: Must meet project threshold (default 95%)
- **Assertions**: Use AssertJ or JUnit assertions
- **Mocking**: Use Mockito when needed

Example test structure:
```java
package com.example.myapp;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import static org.assertj.core.api.Assertions.*;

class UserServiceTest {
    
    private UserService userService;
    
    @BeforeEach
    void setUp() {
        userService = new UserService();
    }
    
    @Test
    @DisplayName("Should create user with valid data")
    void shouldCreateUserWithValidData() {
        // Given
        UserInput input = new UserInput("test@example.com", "password");
        
        // When
        User user = userService.createUser(input);
        
        // Then
        assertThat(user).isNotNull();
        assertThat(user.getEmail()).isEqualTo("test@example.com");
    }
    
    @Test
    @DisplayName("Should throw exception for invalid email")
    void shouldThrowExceptionForInvalidEmail() {
        // Given
        UserInput input = new UserInput("invalid", "password");
        
        // When/Then
        assertThatThrownBy(() -> userService.createUser(input))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("Invalid email");
    }
}
```

## Dependency Management

**CRITICAL**: Use Maven or Gradle with dependency management.

### Maven (pom.xml)

```xml
<properties>
    <java.version>21</java.version>
    <maven.compiler.source>21</maven.compiler.source>
    <maven.compiler.target>21</maven.compiler.target>
</properties>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter</artifactId>
        <version>3.2.0</version>
    </dependency>
    
    <!-- Testing -->
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.10.1</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Gradle (build.gradle)

```gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.0'
}

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter'
    
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.1'
    testImplementation 'org.assertj:assertj-core:3.24.2'
}

test {
    useJUnitPlatform()
}
```

### Dependency Guidelines

1. **Check for latest versions**:
   - Use Context7 MCP tool if available
   - Check Maven Central for latest releases
   - Review changelog for breaking changes

2. **Version Management**:
   - ✅ Use BOM (Bill of Materials) for version consistency
   - ✅ Keep dependencies updated regularly
   - ✅ Use dependency management in parent POM
   - ❌ Don't use SNAPSHOT in production
   - ❌ Don't use vulnerable dependencies

## Error Handling

- Use exceptions for exceptional cases only
- Create custom exceptions extending RuntimeException or Exception
- Use try-with-resources for resource management
- Log errors appropriately
- Never catch and ignore exceptions

Example:
```java
public class UserService {
    
    public User createUser(UserInput input) throws ValidationException {
        if (input.getEmail() == null || input.getEmail().isEmpty()) {
            throw new ValidationException("Email is required");
        }
        
        try {
            return userRepository.save(input);
        } catch (DataAccessException e) {
            throw new ServiceException("Failed to create user", e);
        }
    }
}

public class ValidationException extends RuntimeException {
    public ValidationException(String message) {
        super(message);
    }
}
```

## Documentation

- **Javadoc**: Document all public APIs
- **Package Info**: Create `package-info.java`
- **Examples**: Include usage examples
- **Generate**: `mvn javadoc:javadoc` or `./gradlew javadoc`

Example:
```java
/**
 * Processes user data and returns validated result.
 *
 * <p>This method validates the input data according to business rules
 * and returns a validated User object. If validation fails, it throws
 * a ValidationException with details about the failure.
 *
 * @param input the user input data to process
 * @return validated User object
 * @throws ValidationException if input validation fails
 * @throws ServiceException if database operation fails
 *
 * @see UserInput
 * @see ValidationException
 *
 * @since 1.0.0
 */
public User processUser(UserInput input) throws ValidationException {
    // Implementation
    return null;
}
```

## Project Structure

```
project/
├── pom.xml             # Maven config (or build.gradle)
├── README.md           # Project overview (allowed in root)
├── CHANGELOG.md        # Version history (allowed in root)
├── AGENTS.md          # AI assistant rules (allowed in root)
├── LICENSE            # Project license (allowed in root)
├── CONTRIBUTING.md    # Contribution guidelines (allowed in root)
├── CODE_OF_CONDUCT.md # Code of conduct (allowed in root)
├── SECURITY.md        # Security policy (allowed in root)
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/
│   │   │       ├── Application.java
│   │   │       ├── controller/
│   │   │       ├── service/
│   │   │       └── repository/
│   │   └── resources/
│   │       └── application.properties
│   └── test/
│       ├── java/
│       │   └── com/example/
│       │       ├── service/
│       │       └── repository/
│       └── resources/
├── target/             # Build output (gitignored)
└── docs/               # Documentation
```

## Modern Java Features

### Records (Java 14+)

```java
public record User(String email, String name, LocalDateTime createdAt) {
    // Compact constructor
    public User {
        if (email == null || email.isEmpty()) {
            throw new IllegalArgumentException("Email required");
        }
    }
}
```

### Pattern Matching (Java 17+)

```java
public String processValue(Object value) {
    return switch (value) {
        case String s -> "String: " + s;
        case Integer i -> "Integer: " + i;
        case null -> "Null value";
        default -> "Unknown type";
    };
}
```

### Sealed Classes (Java 17+)

```java
public sealed interface Result<T, E> permits Success, Failure {
    // Interface definition
}

public record Success<T, E>(T value) implements Result<T, E> {}
public record Failure<T, E>(E error) implements Result<T, E> {}
```

## CI/CD Requirements

Must include GitHub Actions workflows for:

1. **Testing** (`java-test.yml`):
   - Test on ubuntu-latest, windows-latest
   - Test on Java 17, 21
   - Upload coverage to Codecov

2. **Linting** (`java-lint.yml`):
   - Checkstyle checks
   - PMD analysis
   - SpotBugs detection

3. **Build** (`java-build.yml`):
   - Build with Maven/Gradle
   - Verify JAR creation
   - Check dependencies

## Package Publication

### Publishing to Maven Central

**Prerequisites:**
1. Sonatype OSSRH account (https://issues.sonatype.org)
2. GPG key for signing
3. Group ID approval (e.g., `io.github.username`)
4. Add credentials to GitHub Secrets

**Maven (pom.xml) Configuration:**

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>io.github.your-username</groupId>
    <artifactId>your-library</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    
    <name>Your Library</name>
    <description>A concise description of your library</description>
    <url>https://github.com/your-org/your-library</url>
    
    <licenses>
        <license>
            <name>MIT License</name>
            <url>https://opensource.org/licenses/MIT</url>
        </license>
    </licenses>
    
    <developers>
        <developer>
            <name>Your Name</name>
            <email>your.email@example.com</email>
            <organization>Your Organization</organization>
            <organizationUrl>https://your-org.com</organizationUrl>
        </developer>
    </developers>
    
    <scm>
        <connection>scm:git:git://github.com/your-org/your-library.git</connection>
        <developerConnection>scm:git:ssh://github.com:your-org/your-library.git</developerConnection>
        <url>https://github.com/your-org/your-library/tree/main</url>
    </scm>
    
    <distributionManagement>
        <repository>
            <id>ossrh</id>
            <url>https://s01.oss.sonatype.org/service/local/staging/deploy/maven2/</url>
        </repository>
    </distributionManagement>
    
    <build>
        <plugins>
            <!-- Source JAR -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-source-plugin</artifactId>
                <version>3.3.0</version>
                <executions>
                    <execution>
                        <id>attach-sources</id>
                        <goals>
                            <goal>jar-no-fork</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
            
            <!-- Javadoc JAR -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-javadoc-plugin</artifactId>
                <version>3.6.3</version>
                <executions>
                    <execution>
                        <id>attach-javadocs</id>
                        <goals>
                            <goal>jar</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
            
            <!-- GPG Signing -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-gpg-plugin</artifactId>
                <version>3.1.0</version>
                <executions>
                    <execution>
                        <id>sign-artifacts</id>
                        <phase>verify</phase>
                        <goals>
                            <goal>sign</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

**Gradle (build.gradle.kts) Configuration:**

```kotlin
plugins {
    `java-library`
    `maven-publish`
    signing
    id("io.github.gradle-nexus.publish-plugin") version "1.3.0"
}

group = "io.github.your-username"
version = "1.0.0"

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
    withSourcesJar()
    withJavadocJar()
}

publishing {
    publications {
        create<MavenPublication>("mavenJava") {
            from(components["java"])
            
            pom {
                name.set("Your Library")
                description.set("A concise description of your library")
                url.set("https://github.com/your-org/your-library")
                
                licenses {
                    license {
                        name.set("MIT License")
                        url.set("https://opensource.org/licenses/MIT")
                    }
                }
                
                developers {
                    developer {
                        id.set("your-username")
                        name.set("Your Name")
                        email.set("your.email@example.com")
                    }
                }
                
                scm {
                    connection.set("scm:git:git://github.com/your-org/your-library.git")
                    developerConnection.set("scm:git:ssh://github.com:your-org/your-library.git")
                    url.set("https://github.com/your-org/your-library")
                }
            }
        }
    }
}

signing {
    sign(publishing.publications["mavenJava"])
}

nexusPublishing {
    repositories {
        sonatype {
            nexusUrl.set(uri("https://s01.oss.sonatype.org/service/local/"))
            snapshotRepositoryUrl.set(uri("https://s01.oss.sonatype.org/content/repositories/snapshots/"))
        }
    }
}
```

**Publishing Workflow:**

1. Update version in pom.xml/build.gradle
2. Update CHANGELOG.md
3. Run quality checks:
   ```bash
   # Maven
   mvn clean test
   mvn checkstyle:check
   mvn pmd:check
   
   # Gradle
   ./gradlew test
   ./gradlew checkstyleMain
   ./gradlew pmdMain
   ```

4. Create git tag: `git tag v1.0.0 && git push --tags`
5. GitHub Actions automatically publishes to Maven Central
6. Or manual publish:
   ```bash
   # Maven
   mvn clean deploy -P release
   
   # Gradle
   ./gradlew publishToSonatype closeAndReleaseSonatypeStagingRepository
   ```

**Publishing Checklist:**

- ✅ All tests passing
- ✅ Checkstyle passes
- ✅ PMD analysis clean
- ✅ SpotBugs finds no issues
- ✅ Version updated
- ✅ CHANGELOG.md updated
- ✅ README.md up to date
- ✅ LICENSE file present
- ✅ Source JAR generated
- ✅ Javadoc JAR generated
- ✅ Artifacts signed with GPG
- ✅ POM metadata complete

**GitHub Secrets:**

Add these secrets to your repository:

- `MAVEN_USERNAME`: Sonatype username
- `MAVEN_PASSWORD`: Sonatype password
- `GPG_PRIVATE_KEY`: Your GPG private key (exported as ASCII)
- `GPG_PASSPHRASE`: GPG key passphrase

**Alternative: GitHub Packages**

For simpler setup, publish to GitHub Packages:

```xml
<distributionManagement>
    <repository>
        <id>github</id>
        <url>https://maven.pkg.github.com/your-org/your-library</url>
    </repository>
</distributionManagement>
```

Users can then add to their pom.xml:
```xml
<repositories>
    <repository>
        <id>github</id>
        <url>https://maven.pkg.github.com/your-org/*</url>
    </repository>
</repositories>
```

<!-- JAVA:END -->

