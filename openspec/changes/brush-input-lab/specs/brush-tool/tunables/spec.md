# Spec Delta

## Purpose

Describes the data-only list of tunable brush and stroke settings, factory presets and scenarios that the SDK publishes so any user interface can render controls without knowing individual settings in advance.

## ADDED Requirements

### Requirement: Tunable settings are published as data
The system SHALL publish a list of tunable settings as plain data. Each entry SHALL give a unique key, a group, the stage it belongs to, whether it applies while capturing or while drawing, a value type, a default, an allowed range or option list, a unit where one applies, and a short help text. The list SHALL contain every setting accepted by the profile and look configurations.

#### Scenario: A UI builds controls from the list
- **WHEN** an application reads the list
- **THEN** it can create a control for each entry and validate values using only the data in that entry

#### Scenario: Defaults match behaviour
- **WHEN** every setting is set to its published default
- **THEN** the behaviour equals the legacy preset

#### Scenario: Completeness
- **WHEN** a setting is accepted by a profile or look configuration
- **THEN** the list contains an entry for it

### Requirement: Out-of-range values are rejected predictably
The system SHALL treat a value outside a setting's published range or option list as invalid, SHALL NOT apply it, and SHALL keep the previous value.

#### Scenario: Value above the range
- **WHEN** an application sets a numeric setting above its maximum
- **THEN** the previous value stays in force and the application is told the value was rejected

### Requirement: Factory presets and scenarios are published
The system SHALL publish factory presets per profile (including `legacy`) and per look (including `legacy`), and named scenarios that each select one preset per profile and one look. The published scenarios SHALL include: A (legacy), B (capture and pressure fixes), C (B plus smoothing and a pressure curve), D (C plus round outline), E (freehand outline), and F (Illustrator-like). Factory presets SHALL be read-only.

#### Scenario: Applying a scenario
- **WHEN** an application applies scenario A
- **THEN** every profile and the look use their legacy presets and strokes are identical to the previous release

#### Scenario: Applying scenario B
- **WHEN** an application applies scenario B
- **THEN** coalesced samples are kept, event time is used, and zero pressure is preserved on every pen profile

#### Scenario: A factory preset cannot be edited
- **WHEN** an application tries to change a factory preset in place
- **THEN** the change is rejected and a copy under a new name can be created instead

### Requirement: Configurations can be exported and imported as data
The system SHALL export the current profile and look configuration as a JSON document containing a version, and SHALL accept such a document to restore the configuration. A document with an unknown version or invalid values SHALL be rejected without changing the current configuration.

#### Scenario: Round trip
- **WHEN** a configuration is exported and later imported
- **THEN** every profile and the look have the same values as at export

#### Scenario: Invalid document
- **WHEN** an imported document has an unsupported version
- **THEN** the current configuration is unchanged and the application is told why
