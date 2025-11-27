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

## 4. Workflow Scripts
- [ ] 4.1 Create helper script to run specific workflows
- [ ] 4.2 Create script to run all test workflows
- [ ] 4.3 Add support for CI environment variables
- [ ] 4.4 Implement automatic detection of available workflows

## 5. Documentation and Errors
- [ ] 5.1 Create documentation about requirements (Docker TCP, etc)
- [ ] 5.2 Add clear error messages with solutions
- [ ] 5.3 Create troubleshooting guide
- [ ] 5.4 Add usage examples to README

## 6. Testing and Validation
- [ ] 6.1 Write tests for Docker/ACT detection
- [ ] 6.2 Write tests for installation (mocks)
- [ ] 6.3 Write tests for workflow execution
- [ ] 6.4 Validate functionality on Windows, Linux, and Mac (when possible)
