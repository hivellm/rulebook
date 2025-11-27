## 1. Setup and Detection
- [ ] 1.1 Create `src/core/act-runner.ts` module to manage ACT
- [ ] 1.2 Implement Docker detection (Windows, Linux, Mac)
- [ ] 1.3 Implement ACT installation detection
- [ ] 1.4 Create functions to verify Docker daemon accessibility
- [ ] 1.5 Create functions to verify Docker TCP is exposed (when needed)

## 2. Automatic Installation
- [ ] 2.1 Create Docker installation script (with platform-specific instructions)
- [ ] 2.2 Create ACT installation script (Windows, Linux, Mac)
- [ ] 2.3 Implement fallback with manual instructions when automatic installation fails
- [ ] 2.4 Add post-installation validation

## 3. CLI Command
- [ ] 3.1 Add `rulebook test:act` or `rulebook test:ci` command
- [ ] 3.2 Implement options: `--workflow`, `--job`, `--event`
- [ ] 3.3 Add `--setup` flag for initial installation
- [ ] 3.4 Add `--verbose` flag for debugging
- [ ] 3.5 Implement error handling with clear messages
- [ ] 3.6 Add configuration option to enable ACT as default test method

## 4. Workflow Scripts
- [ ] 4.1 Create helper script to run specific workflows (use nexus ACT script as reference)
- [ ] 4.2 Create script to run all test workflows via ACT
- [ ] 4.3 Add support for CI environment variables
- [ ] 4.4 Implement automatic detection of available workflows
- [ ] 4.5 Create `scripts/test-act.sh` (or `.js` for cross-platform) that runs tests via ACT
- [ ] 4.6 Script should handle ACT setup, workflow execution, and error reporting

## 5. Pre-Push Hook Integration
- [ ] 5.1 Detect if ACT is enabled in project configuration
- [ ] 5.2 Modify `generatePrePushHook` to check for ACT script availability
- [ ] 5.3 If ACT is enabled and script exists, use `scripts/test-act.sh` (or `.js`) instead of direct `npm test`
- [ ] 5.4 Fallback to regular tests if ACT script fails or is not available
- [ ] 5.5 Add configuration flag in `.rulebook` to enable/disable ACT in pre-push

## 6. Documentation and Errors
- [ ] 6.1 Create documentation about requirements (Docker TCP, etc)
- [ ] 6.2 Add clear error messages with solutions
- [ ] 6.3 Create troubleshooting guide
- [ ] 6.4 Add usage examples to README

## 7. Testing and Validation
- [ ] 7.1 Write tests for Docker/ACT detection
- [ ] 7.2 Write tests for installation (mocks)
- [ ] 7.3 Write tests for workflow execution
- [ ] 7.4 Write tests for pre-push hook integration with ACT
- [ ] 7.5 Validate functionality on Windows, Linux, and Mac (when possible)
