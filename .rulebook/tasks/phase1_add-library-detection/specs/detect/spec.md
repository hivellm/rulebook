# Detection Specification

## ADDED Requirements

### Requirement: Library Registry
The system SHALL define a data-driven library registry where each entry maps a library
identifier to its detection signals (npm, cargo, pip, or go-module package names and
marker files), its owning language, its template path, and optional path-scoped rule globs.

#### Scenario: Adding a library requires only a registry entry and a template
Given a developer wants Rulebook to recognize a new library
When they add one entry to the registry and one template file
Then library detection and rule generation work for it without changes to the detector or generator code

#### Scenario: Registry entry declares its owning language
Given a registry entry for a library
When the entry is defined
Then it MUST declare the language it belongs to so prompts can group libraries by language

### Requirement: Library Detection From Manifests
The system SHALL detect libraries by parsing project manifests (`package.json`,
`Cargo.toml`, `pyproject.toml`/`requirements.txt`, `go.mod`) and matching declared
dependencies against the library registry, considering only direct dependencies.

#### Scenario: Detect a library from direct dependencies
Given a project whose package.json lists "prisma" in dependencies
When detectLibraries runs
Then the result includes a detection for prisma with its indicators

#### Scenario: Ignore transitive dependencies
Given a library that appears only as a transitive dependency and not in the project manifest
When detectLibraries runs
Then that library MUST NOT be reported as detected

#### Scenario: Empty project yields no libraries
Given a project directory with no recognized manifests
When detectLibraries runs
Then it returns an empty list without error

### Requirement: Detection Result Includes Libraries
The system SHALL include the detected libraries in the `DetectionResult` returned by
`detectProject`, sorted by descending confidence.

#### Scenario: detectProject exposes libraries
Given a project with detectable libraries
When detectProject runs
Then the returned DetectionResult contains a libraries array sorted by confidence
