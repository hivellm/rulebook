<!-- SAS:START -->
# SAS Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
# Run SAS code validation (project-specific)
# Run SASUnit tests
# Check log files for errors/warnings

# SAS projects typically use:
sas -sysin validate_code.sas  # Code validation
sas -sysin run_tests.sas      # Run SASUnit tests
```

## SAS Configuration

**CRITICAL**: Use SAS 9.4+ with code validation and testing.

- **Version**: SAS 9.4+ or Viya 3.5+
- **Linter**: SAS Code Analyzer
- **Testing**: SASUnit or custom test frameworks
- **Version Control**: Track all .sas files

## Code Quality Standards

### Mandatory Quality Checks

**IMPORTANT**: These commands MUST match your GitHub Actions workflows!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Validate SAS code syntax (matches workflow)
sas -sysin your_program.sas -nosplash -print /dev/null

# 2. Run SASUnit tests (matches workflow)
%include "sasunit/run_all_tests.sas";

# 3. Check for warnings and errors (matches workflow)
grep -i "ERROR\|WARNING" your_program.log

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**Why This Matters:**
- SAS code with syntax errors will fail in production
- Missing test validation = data processing errors

### Code Style

```sas
/* Good: Clear, commented, structured */
%macro process_data(input_ds=, output_ds=, threshold=0.5);
    %* Validate inputs;
    %if %length(&input_ds) = 0 %then %do;
        %put ERROR: input_ds parameter required;
        %return;
    %end;
    
    /* Process data */
    data &output_ds;
        set &input_ds;
        where value > &threshold;
    run;
%mend;
```

<!-- SAS:END -->

