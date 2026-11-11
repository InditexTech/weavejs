# Spec Delta

## MODIFIED Requirements

### Requirement: A stroke's first recorded pressure is corrected once a real second sample exists
The system SHALL, under the legacy start policy (the default), treat a stroke's first (pointer-down) pressure sample as provisional, and SHALL replace it with the pressure of the stroke's first real (non-speculative) movement sample as soon as that sample is available, so that an unrepresentative initial contact reading does not persist for the lifetime of the stroke. A profile MAY select a different start policy (average of the first readings, or none); under those policies the first point's pressure SHALL follow the selected policy instead.

#### Scenario: An elevated initial contact pressure is corrected by the next real sample
- **WHEN** a stroke's first pointer sample reports a pressure noticeably higher than the pressure reported by the very next real pointer sample and the start policy is the legacy one
- **THEN** the stroke's first recorded point ends up with the second sample's pressure, not the first sample's

#### Scenario: Speculative (predicted) samples do not perform this correction
- **WHEN** the pointing device's next reported sample after stroke start is a speculative/predicted sample rather than a real one
- **THEN** the stroke's first recorded point's pressure is left unchanged until a real sample arrives

#### Scenario: The correction only applies to the transition from one point to two
- **WHEN** a stroke already has two or more recorded points
- **THEN** later samples do not further modify the first point's pressure

#### Scenario: A different start policy
- **WHEN** the profile selects the average-of-first-readings policy
- **THEN** the first point's pressure is the average of the first readings, and the legacy replacement is not applied

## ADDED Requirements

### Requirement: Zero pressure from a pen is preserved when configured
The system SHALL support a pressure setting, per profile, that keeps a reported pressure of 0 from a pen as a very low pressure instead of replacing it with the neutral value 0.5, or holds the last non-zero pressure. Under the legacy setting (the default) a reported pressure of 0 SHALL continue to be replaced by 0.5. Pointers that do not report pressure SHALL always use the neutral value.

#### Scenario: Pen lift-off with the keep setting
- **WHEN** a pen reports pressure falling to 0 at the end of a stroke and the keep setting is selected
- **THEN** the recorded pressures fall towards the pressure floor without a rise to 0.5

#### Scenario: Legacy setting
- **WHEN** the legacy setting is selected and a pen reports pressure 0
- **THEN** the sample is recorded as if its pressure were 0.5

#### Scenario: A mouse
- **WHEN** a mouse draws a stroke
- **THEN** every point has the neutral pressure 0.5 regardless of the setting

### Requirement: Pressure filtering is selectable per profile
The system SHALL support, per profile, a pressure filter that is one of: legacy (the current velocity-adaptive smoothing), time-based smoothing with a configurable time constant, One Euro filter, or none. Every filter SHALL leave the first sample of a stroke unaffected by earlier strokes, and SHALL never produce a non-finite pressure.

#### Scenario: Time-based smoothing at different report rates
- **WHEN** the same pressure signal is reported at 133 Hz and at 240 Hz with time-based smoothing
- **THEN** the filtered pressure curves agree within a small tolerance

#### Scenario: Filter off
- **WHEN** the filter is none
- **THEN** recorded pressures equal the reported pressures, subject only to the pressure floor

#### Scenario: Invalid sample
- **WHEN** a sample reports a non-finite pressure
- **THEN** the filter state stays finite and the sample is recorded with the neutral pressure
