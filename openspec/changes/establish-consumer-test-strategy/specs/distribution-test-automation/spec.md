## ADDED Requirements

### Requirement: Relevant pull requests run required distribution validation
The CI system SHALL run affected lint, type-check, build, and unit tests for every relevant pull request. A pull request that changes a publishable package, package metadata, a generator, or a reference consumer MUST additionally run tarball-consumer validation and the WebSocket collaboration scenario as blocking checks.

#### Scenario: A publishable package changes
- **WHEN** a pull request changes a publishable package or its package metadata
- **THEN** CI runs the tarball-consumer and WebSocket collaboration checks and blocks the pull request if either fails

#### Scenario: An unrelated documentation-only change occurs
- **WHEN** a pull request does not modify a selected code or distribution-validation path
- **THEN** CI does not run the distribution-validation lane solely because of that change

### Requirement: Complete transport coverage runs before releases
The CI system SHALL run a nightly matrix covering every supported standalone and WebSocket configuration and SHALL run the same full matrix for release candidates before publication. The nightly matrix MUST also run the WebSocket collaboration scenario against Firefox in addition to Chromium; the pull-request collaboration gate remains Chromium-only for speed.

#### Scenario: Nightly validation runs the transport matrix
- **WHEN** the scheduled nightly workflow starts
- **THEN** it executes the complete supported standalone and WebSocket configuration matrix

#### Scenario: A release candidate is prepared
- **WHEN** a release candidate enters publication validation
- **THEN** the complete nightly transport matrix passes before publication proceeds

#### Scenario: Nightly validation runs the collaboration scenario on a second browser engine
- **WHEN** the scheduled nightly workflow runs the WebSocket collaboration scenario
- **THEN** it executes that scenario against both Chromium and Firefox

### Requirement: Cloud transports remain independent of CI integration infrastructure
Azure Web PubSub validation SHALL use unit and contract tests with controlled mocks. The normal tarball-consumer, reference-consumer, and collaboration lanes MUST NOT require Azure credentials or a live external cloud service.

#### Scenario: A standard pull request runs distribution validation
- **WHEN** CI runs the normal distribution-validation lane
- **THEN** the lane completes without requesting cloud credentials or contacting a live Azure service

### Requirement: Distribution validation is efficient and diagnosable
The CI system SHALL select distribution jobs by relevant paths and cache package-manager dependencies and reusable build artifacts. A failed distribution job MUST identify the failed validation stage and affected consumer or configuration.

#### Scenario: A cached relevant validation run starts
- **WHEN** a relevant pull request reruns without dependency or artifact-input changes
- **THEN** CI reuses eligible dependency and build caches while still executing the required validation

#### Scenario: A matrix configuration fails
- **WHEN** a tarball consumer or transport configuration fails
- **THEN** CI identifies the failed validation stage and consumer or configuration in the job result
