# Spec Delta

## MODIFIED Requirements

### Requirement: Strokes without a look render as before
The system SHALL render a stroke that has no look setting exactly as in the previous release, except that its line reaches its last point, and SHALL NOT require any change to existing documents.

#### Scenario: Existing stroke
- **WHEN** a document created before this change is opened
- **THEN** every stroke is drawn the same as in the previous release, except that a stroke whose last points are closer together than the minimum spacing of its line ends at its last point

## ADDED Requirements

### Requirement: The line of a stroke reaches its last point
The system SHALL draw the line of a stroke, with a look or without one, up to its last point, whatever the spacing of the points. The same shape drawn from dense points and from sparse points SHALL end in the same place, so that the end of a stroke, and a taper measured from it, do not move when its points are reduced.

#### Scenario: Dense points
- **WHEN** a stroke has points closer together than the minimum spacing of its line
- **THEN** the line ends at the last point

#### Scenario: Dense and sparse
- **WHEN** one shape is drawn from dense points and from a few points
- **THEN** both lines end at the same position
