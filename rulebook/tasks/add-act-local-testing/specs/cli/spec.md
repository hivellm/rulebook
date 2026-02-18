# CLI Command Specification

## ADDED Requirements

### Requirement: ACT Testing Command

The system SHALL provide a CLI command to run GitHub Actions workflows locally using ACT.

#### Scenario: User runs ACT test command
Given the user has Docker and ACT installed
When the user executes `rulebook test:act`
Then the system SHALL run all test workflows using ACT
And the system SHALL display output similar to GitHub Actions
And the system SHALL exit with code 0 on success or non-zero on failure

#### Scenario: User runs specific workflow
Given the user has Docker and ACT installed
When the user executes `rulebook test:act --workflow test.yml`
Then the system SHALL run only the specified workflow
And the system SHALL display workflow-specific output

#### Scenario: User runs setup command
Given Docker or ACT is not installed
When the user executes `rulebook test:act --setup`
Then the system SHALL attempt to install missing dependencies
And the system SHALL provide manual installation instructions if automatic installation fails
And the system SHALL validate installation after completion

#### Scenario: Docker daemon not accessible
Given Docker is installed but daemon is not running or not accessible
When the user executes `rulebook test:act`
Then the system SHALL detect the issue
And the system SHALL display a clear error message with instructions
And the system SHALL suggest solutions (start Docker, expose TCP, etc)

#### Scenario: ACT not installed
Given Docker is available but ACT is not installed
When the user executes `rulebook test:act`
Then the system SHALL detect ACT is missing
And the system SHALL offer to install ACT automatically
And the system SHALL provide manual installation instructions if automatic installation fails

#### Scenario: Feature is optional
Given Docker or ACT are not available
When the user executes `rulebook test:act`
Then the system SHALL NOT fail the entire CLI
And the system SHALL display helpful error messages
And the system SHALL suggest using `--setup` flag

### Requirement: Cross-Platform Support

The system SHALL support ACT testing on Windows, Linux, and macOS.

#### Scenario: Windows detection
Given the system is running on Windows
When detecting Docker and ACT
Then the system SHALL check for Docker Desktop
And the system SHALL use Windows-specific installation methods
And the system SHALL handle Windows path separators correctly

#### Scenario: Linux detection
Given the system is running on Linux
When detecting Docker and ACT
Then the system SHALL check for Docker daemon via systemd or service
And the system SHALL use Linux package managers (apt, yum, etc)
And the system SHALL handle Linux-specific Docker socket paths

#### Scenario: macOS detection
Given the system is running on macOS
When detecting Docker and ACT
Then the system SHALL check for Docker Desktop for Mac
And the system SHALL use Homebrew for ACT installation
And the system SHALL handle macOS-specific paths

### Requirement: Error Handling

The system SHALL provide clear error messages and recovery instructions.

#### Scenario: Docker TCP not exposed
Given Docker is running but TCP is not exposed
When ACT requires TCP access
Then the system SHALL detect the issue
And the system SHALL provide platform-specific instructions to expose TCP
And the system SHALL warn about security implications

#### Scenario: Permission denied
Given Docker requires elevated permissions
When the user runs ACT command
Then the system SHALL detect permission issues
And the system SHALL provide instructions to add user to docker group (Linux)
Or suggest running with appropriate permissions

### Requirement: Pre-Push Hook Integration

The system SHALL integrate ACT testing into pre-push hooks when enabled.

#### Scenario: ACT enabled in pre-push hook
Given ACT is enabled in project configuration
And `scripts/test-act.sh` (or `.js`) exists
When the user attempts to push changes
Then the pre-push hook SHALL execute the ACT test script instead of direct `npm test`
And the hook SHALL use ACT to run GitHub Actions workflows
And the hook SHALL block push if ACT tests fail

#### Scenario: ACT script not available
Given ACT is enabled but script is missing
When the user attempts to push changes
Then the pre-push hook SHALL fallback to regular `npm test`
And the hook SHALL warn that ACT script is not available
And the hook SHALL suggest running `rulebook test:act --setup`

#### Scenario: ACT disabled in configuration
Given ACT is not enabled in project configuration
When the user attempts to push changes
Then the pre-push hook SHALL use regular test commands
And the hook SHALL NOT attempt to use ACT
And the hook SHALL behave as if ACT feature doesn't exist

