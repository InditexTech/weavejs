## ADDED Requirements

### Requirement: Generator behavior is directly tested without dependency installation
Each frontend and backend generator SHALL have direct tests that run generation with dependency installation disabled. The tests MUST validate the output tree, renamed dotfiles, generated package manifest, selected transport configuration, and invalid-input error handling.

#### Scenario: Generator creates a selected transport starter
- **WHEN** a generator is run with a supported transport and dependency installation disabled
- **THEN** the output contains the expected application files, renamed dotfiles, manifest, and selected transport configuration

#### Scenario: Generator receives invalid input
- **WHEN** a generator receives unsupported or invalid generation input
- **THEN** it reports an error and does not report a successfully generated starter

### Requirement: Generated starters build against packed artifacts
The validation system SHALL generate every supported standalone and WebSocket frontend and backend starter, existing and newly-added canonical, into a temporary directory, install locally packed Weave.js artifacts, type-check the project, and complete its production build. Azure Web PubSub generator templates are outside this validation's scope.

#### Scenario: Generated frontend starter builds
- **WHEN** a supported frontend starter is generated and installed with packed artifacts
- **THEN** its type-check and production build complete successfully

#### Scenario: Generated backend starter builds
- **WHEN** a supported backend starter is generated and installed with packed artifacts
- **THEN** its type-check and production build complete successfully

### Requirement: Canonical starter source is added without removing existing templates
The generators SHALL add a new Vite + React frontend starter option and a new minimal Express + WebSocket backend starter option that share source with the reference consumers established for this strategy. Every existing generator template SHALL remain available with unchanged behavior; no existing template is replaced, migrated, or removed. Application source shared between reference consumers and the new canonical starters MUST have one canonical implementation; generators MUST limit their unique logic for these options to naming, dependency versions, installation, README generation, prompts, and other generation-specific metadata.

#### Scenario: A new canonical starter option is added
- **WHEN** the canonical Vite + React frontend or minimal Express + WebSocket backend option is added to a generator
- **THEN** the generator offers it as an additional choice using the reference consumer's established minimal rectangle lifecycle and WebSocket integration shape, without altering any existing template's output or behavior

#### Scenario: A canonical starter behavior changes
- **WHEN** application source shared by an established reference consumer and a new canonical generated starter changes
- **THEN** the reference consumer and generated-project validation both exercise the changed canonical behavior
