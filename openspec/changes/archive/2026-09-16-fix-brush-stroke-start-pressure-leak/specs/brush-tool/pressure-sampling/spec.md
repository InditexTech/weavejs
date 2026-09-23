## Purpose

Defines how the brush tool samples and smooths pointer pressure while a stroke is being drawn, so that pressure-driven stroke width reflects only the current stroke's own input and never carries over state left behind by a previously completed, unrelated stroke.

## ADDED Requirements

### Requirement: Stroke-start pressure baseline is independent of prior strokes
The system SHALL compute the pressure-smoothing state used for a new stroke's first pointer sample starting from a neutral, fixed baseline, and SHALL discard any pressure-smoothing state, pointer position, or pointer timestamp retained from a previously completed stroke before that first sample is produced.

#### Scenario: New stroke starts right after a high-pressure stroke ends
- **WHEN** a user finishes a stroke while its smoothed pressure was high, then immediately begins a new stroke
- **THEN** the new stroke's first pointer sample is smoothed against the neutral baseline, not against the pressure the previous stroke ended on

#### Scenario: New stroke starts far from where the previous stroke ended
- **WHEN** a user begins a new stroke at a screen position far from the previous stroke's last recorded position, shortly after that stroke ended
- **THEN** the system does not treat the distance between the two strokes' positions as movement velocity for the new stroke's first sample

### Requirement: Pressure-smoothing state is scoped to a single stroke
The system SHALL treat pressure-smoothing state (accumulated smoothed pressure, last known pointer position, last known pointer timestamp, and any provisional/predicted sample bookkeeping) as belonging to exactly one stroke, resetting it when a stroke starts and before that stroke's first pressure sample is computed — not after.

#### Scenario: Consecutive strokes in one drawing session are sampled independently
- **WHEN** a user draws several separate strokes in the same drawing session without switching tools between them
- **THEN** each stroke's first pressure sample is unaffected by the pressure-smoothing state left behind by any earlier stroke in that session

#### Scenario: Rapid successive strokes do not compound pressure
- **WHEN** a user draws several strokes in quick succession, each starting soon after the previous one ends
- **THEN** no stroke's first-sample pressure is pulled higher or lower by the ending pressure of the stroke before it

### Requirement: A stroke's first recorded pressure is corrected once a real second sample exists
The system SHALL treat a stroke's first (pointer-down) pressure sample as provisional, and SHALL replace it with the pressure of the stroke's first real (non-speculative) movement sample as soon as that sample is available, so that an unrepresentative initial contact reading does not persist for the lifetime of the stroke.

#### Scenario: An elevated initial contact pressure is corrected by the next real sample
- **WHEN** a stroke's first pointer sample reports a pressure noticeably higher than the pressure reported by the very next real pointer sample
- **THEN** the stroke's first recorded point ends up with the second sample's pressure, not the first sample's

#### Scenario: Speculative (predicted) samples do not perform this correction
- **WHEN** the pointing device's next reported sample after stroke start is a speculative/predicted sample rather than a real one
- **THEN** the stroke's first recorded point's pressure is left unchanged until a real sample arrives

#### Scenario: The correction only applies to the transition from one point to two
- **WHEN** a stroke already has two or more recorded points
- **THEN** later samples do not further modify the first point's pressure
