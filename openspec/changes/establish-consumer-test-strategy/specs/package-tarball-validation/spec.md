## ADDED Requirements

### Requirement: Publishable packages are validated as packed dependencies
The validation system SHALL build every publishable package selected for distribution validation, create an npm tarball for each selected package, and install the tarballs into an isolated temporary consumer directory. The consumer directory MUST NOT use npm workspace links, file references to package source, or a registry-published Weave.js artifact.

#### Scenario: Packed package installs in an isolated consumer
- **WHEN** a selected publishable package is validated
- **THEN** its consumer installs the locally packed tarball and does not resolve that package from the monorepo workspace

#### Scenario: Packed package omits a required published file
- **WHEN** a consumer imports a file or declaration omitted from a selected package tarball
- **THEN** the distribution validation fails before the change is eligible for release

### Requirement: Public browser and server entry points compile for consumers
The validation system SHALL type-check and production-build consumer projects that explicitly import supported browser entry points and `@inditextech/weave-sdk/server`. The validation MUST detect invalid exports, missing declarations, browser/server boundary leaks, unresolved transitive dependencies, and invalid peer dependency metadata.

#### Scenario: Browser consumer imports a supported package entry point
- **WHEN** an isolated browser consumer imports a supported browser entry point from a packed package
- **THEN** its type-check and production build complete successfully

#### Scenario: Backend consumer imports the SDK server entry point
- **WHEN** an isolated backend consumer imports `@inditextech/weave-sdk/server` from a packed SDK tarball
- **THEN** its type-check and production build complete successfully without importing browser-only code

### Requirement: Tarball validation reports package-boundary failures
The validation system SHALL fail the relevant distribution check when packing, installing, type-checking, or building a selected consumer fails.

#### Scenario: A packed artifact has invalid dependency metadata
- **WHEN** the isolated consumer cannot install or build because a packed artifact declares invalid dependency metadata
- **THEN** the distribution check fails with the affected package and consumer identified
