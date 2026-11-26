# Spec Delta

## ADDED Requirements

### Requirement: New settings are published and validated
The published list SHALL contain an entry, with default, range or options and help text, for `ends`, `variance`, `width.easing`, `width.nibAngle`, `width.nibContrast`, `pressure.synth` and the Shift lock setting. Values outside the range or options SHALL be rejected without being applied. The defaults SHALL equal the legacy behaviour.

#### Scenario: Completeness
- **WHEN** the list is read
- **THEN** every new look and profile field has an entry

#### Scenario: Out of range
- **WHEN** an application sets `variance` to 2
- **THEN** the previous value stays and the value is reported as rejected

#### Scenario: Defaults
- **WHEN** every new setting is at its default
- **THEN** behaviour and rendering equal the legacy preset
