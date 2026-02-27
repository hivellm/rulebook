<!-- OBJECTIVEC:START -->
# Objective-C Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
xcodebuild clean build    # Build verification
xcodebuild test -scheme YourScheme  # All tests
# clang static analyzer runs automatically in Xcode builds

# Security audit:
# Use Xcode's built-in analyzer or third-party tools
```

## Objective-C Configuration

**CRITICAL**: Use Modern Objective-C with ARC and strict warnings.

- **Version**: Xcode 15+
- **ARC**: Automatic Reference Counting required
- **Formatter**: clang-format
- **Testing**: XCTest
- **Analyzer**: clang static analyzer

## Code Quality Standards

### Mandatory Quality Checks

**IMPORTANT**: These commands MUST match your GitHub Actions workflows!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow)
clang-format --dry-run --Werror **/*.{h,m}

# 2. Static analysis (matches workflow)
xcodebuild analyze -scheme YourScheme -sdk iphonesimulator

# 3. Build (matches workflow)
xcodebuild build -scheme YourScheme -sdk iphonesimulator \
  ONLY_ACTIVE_ARCH=NO CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO

# 4. Run tests (matches workflow)
xcodebuild test -scheme YourScheme -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 15'

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**Why This Matters:**
- Example: Using `clang-format -i` locally but `--dry-run` in CI = failure

### Testing Example (XCTest)

```objective-c
@import XCTest;
#import "DataProcessor.h"

@interface DataProcessorTests : XCTestCase
@property (nonatomic, strong) DataProcessor *processor;
@end

@implementation DataProcessorTests

- (void)setUp {
    [super setUp];
    self.processor = [[DataProcessor alloc] initWithThreshold:0.5];
}

- (void)testProcessValidInput {
    NSArray *input = @[@1, @2, @3];
    NSArray *result = [self.processor process:input];
    
    XCTAssertNotNil(result);
    XCTAssertGreaterThan(result.count, 0);
}

- (void)testProcessHandlesNil {
    XCTAssertThrows([self.processor process:nil]);
}

@end
```

<!-- OBJECTIVEC:END -->

