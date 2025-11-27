# Core ACT Runner Specification

## ADDED Requirements

### Requirement: ACT Runner Module

The system SHALL provide a core module `ActRunner` to manage ACT operations.

#### Scenario: Detect Docker installation
Given the system needs to check for Docker
When `ActRunner.detectDocker()` is called
Then the system SHALL check for Docker binary in PATH
And the system SHALL verify Docker daemon is accessible
And the system SHALL return installation status and path
And the system SHALL handle errors gracefully

#### Scenario: Detect ACT installation
Given the system needs to check for ACT
When `ActRunner.detectAct()` is called
Then the system SHALL check for ACT binary in PATH
And the system SHALL verify ACT version compatibility
And the system SHALL return installation status and path
And the system SHALL handle errors gracefully

#### Scenario: Install Docker automatically
Given Docker is not installed
When `ActRunner.installDocker()` is called
Then the system SHALL attempt platform-specific installation
And the system SHALL provide progress feedback
And the system SHALL validate installation after completion
And the system SHALL return installation result with error details if failed

#### Scenario: Install ACT automatically
Given ACT is not installed
When `ActRunner.installAct()` is called
Then the system SHALL use platform-specific package manager
And the system SHALL provide progress feedback
And the system SHALL validate installation after completion
And the system SHALL return installation result with error details if failed

#### Scenario: Run workflow with ACT
Given Docker and ACT are available
When `ActRunner.runWorkflow(workflowPath, options)` is called
Then the system SHALL execute ACT with correct parameters
And the system SHALL stream output in real-time
And the system SHALL capture exit code
And the system SHALL return execution result

#### Scenario: List available workflows
Given the project has GitHub Actions workflows
When `ActRunner.listWorkflows()` is called
Then the system SHALL scan `.github/workflows/` directory
And the system SHALL return list of workflow files
And the system SHALL parse workflow names and jobs

### Requirement: Docker Daemon Access

The system SHALL detect and handle Docker daemon accessibility issues.

#### Scenario: Check Docker daemon via socket
Given the system is on Linux or macOS
When checking Docker accessibility
Then the system SHALL check Docker socket at `/var/run/docker.sock`
And the system SHALL verify socket permissions
And the system SHALL return accessibility status

#### Scenario: Check Docker daemon via TCP
Given the system requires TCP access (Windows or remote Docker)
When checking Docker accessibility
Then the system SHALL check Docker TCP endpoint
And the system SHALL verify connection is possible
And the system SHALL return accessibility status with endpoint details

#### Scenario: Docker daemon not running
Given Docker is installed but daemon is not running
When checking Docker accessibility
Then the system SHALL detect daemon is not running
And the system SHALL provide instructions to start Docker
And the system SHALL suggest platform-specific commands

### Requirement: Platform Detection

The system SHALL accurately detect the operating system platform.

#### Scenario: Detect Windows
Given the system is Windows
When `ActRunner.detectPlatform()` is called
Then the system SHALL return `'windows'`
And the system SHALL use Windows-specific logic

#### Scenario: Detect Linux
Given the system is Linux
When `ActRunner.detectPlatform()` is called
Then the system SHALL return `'linux'`
And the system SHALL use Linux-specific logic

#### Scenario: Detect macOS
Given the system is macOS
When `ActRunner.detectPlatform()` is called
Then the system SHALL return `'darwin'` or `'macos'`
And the system SHALL use macOS-specific logic

### Requirement: Error Recovery

The system SHALL provide helpful error messages and recovery suggestions.

#### Scenario: Installation failure
Given automatic installation fails
When installation error occurs
Then the system SHALL capture error details
And the system SHALL provide manual installation instructions
And the system SHALL include platform-specific commands
And the system SHALL include links to official documentation

#### Scenario: ACT execution failure
Given ACT command fails
When workflow execution error occurs
Then the system SHALL capture error output
And the system SHALL parse ACT error messages
And the system SHALL provide troubleshooting suggestions
And the system SHALL suggest common fixes (Docker issues, workflow syntax, etc)

### Requirement: ACT Test Script

The system SHALL provide a test script that runs tests via ACT.

#### Scenario: Script runs tests via ACT
Given Docker and ACT are available
When `scripts/test-act.sh` (or `.js`) is executed
Then the script SHALL detect available test workflows
And the script SHALL run workflows using ACT
And the script SHALL display output similar to GitHub Actions
And the script SHALL exit with code 0 on success or non-zero on failure

#### Scenario: Script handles missing dependencies
Given Docker or ACT are not available
When `scripts/test-act.sh` (or `.js`) is executed
Then the script SHALL detect missing dependencies
And the script SHALL provide clear error messages
And the script SHALL suggest installation steps
And the script SHALL exit with non-zero code

#### Scenario: Script is cross-platform
Given the script needs to run on Windows, Linux, or Mac
When the script is executed
Then the script SHALL detect the platform
And the script SHALL use platform-appropriate commands
And the script SHALL handle path separators correctly

