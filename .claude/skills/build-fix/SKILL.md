---
name: build-fix
description: Diagnose and fix build failures or CI issues
model: sonnet
context: fork
agent: build-engineer
---
Diagnose and fix the current build failure.

If $ARGUMENTS is provided, focus on that specific build error or CI job.

Steps:
1. Run the build command and capture the error output
2. Read the error message and trace to the source file
3. Identify the root cause (missing dep, type error, config issue)
4. Apply the minimal fix
5. Re-run the build to verify the fix works
