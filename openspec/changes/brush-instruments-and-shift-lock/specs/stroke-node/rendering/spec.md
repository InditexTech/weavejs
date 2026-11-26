# Spec Delta

## ADDED Requirements

### Requirement: Flat or round ends
A look MAY set `ends` to `flat`. A round-outline stroke with flat ends SHALL NOT draw discs at its start and end, and a stroke of a single point SHALL still be drawn as a disc. The default SHALL be round ends.

#### Scenario: Flat ends
- **WHEN** a stroke with `ends` set to `flat` is drawn
- **THEN** its start and end are cut square

#### Scenario: Single point
- **WHEN** a flat-ended stroke has one point
- **THEN** it is drawn as a disc

### Requirement: Deterministic width variance
A look MAY set `variance` from 0 to 1. The variation SHALL depend only on the stroke id and the points, so every viewer and every redraw yields the same outline. A variance of 0 SHALL add no variation.

#### Scenario: Two viewers
- **WHEN** a stroke with variance is shown on two devices
- **THEN** both draw identical widths

#### Scenario: Redraw
- **WHEN** a stroke is redrawn at a different zoom
- **THEN** its relative width profile is the same

### Requirement: Width easing and nib
A look MAY set `width.easing` to reshape the width response, and `width.nibAngle` and `width.nibContrast` so that width follows the angle between the direction of travel and the nib, measured over a distance window. Both SHALL apply to the legacy ribbon and the round outline. With the defaults, widths SHALL equal those of the previous release.

#### Scenario: Nib across and along
- **WHEN** a nib stroke travels perpendicular to the nib and then parallel to it
- **THEN** the perpendicular part is wider by the nib contrast

#### Scenario: Defaults
- **WHEN** a look sets none of these fields
- **THEN** widths equal those of the previous release

### Requirement: New fields degrade gracefully
New look fields SHALL be optional with `look.version` remaining 1. A stored value that is invalid SHALL be clamped or replaced by its default, so it can never make the renderer misbehave.

#### Scenario: Invalid stored value
- **WHEN** a stored look has `variance` of 5
- **THEN** it is clamped to the maximum and the stroke is drawn
